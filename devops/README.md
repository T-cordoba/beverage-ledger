# Infraestructura de CI: Jenkins + SonarQube

Todo corre en Docker sobre una red compartida, `devops-net`. Los contenedores que
**lanza el propio pipeline** —`beverage-ledger-api` y `beverage-ledger-front`— se
unen a esa misma red, que es lo que permite a Jenkins comprobar su salud por
nombre en vez de por `localhost`.

```
devops-net
├── jenkins                :8080   Jenkins LTS + Node 22 + pnpm + docker CLI
├── sonarqube              :9000   sonarqube:latest
├── beverage-ledger-api    :3001   desplegado por el pipeline de la API
└── beverage-ledger-front  :3000   desplegado por el pipeline del front
```

Jenkins monta `/var/run/docker.sock`: construye y arranca contenedores en el
daemon del **host**, no dentro de sí mismo.

> Los comandos son para **PowerShell**. En Git Bash, `/var/run/docker.sock` se
> convierte a una ruta de Windows y `docker run` falla con "Acceso denegado"; si
> lo necesitas ahí, dobla la barra inicial: `//var/run/docker.sock`.

---

## 1. Red y volúmenes

```powershell
docker network create devops-net

docker volume create jenkins_home
docker volume create sonarqube_data
docker volume create sonarqube_logs
docker volume create sonarqube_extensions
```

## 2. Jenkins

`-u root` porque en Docker Desktop el socket montado queda `root:root` y el
usuario `jenkins` no puede escribirlo. Es un entorno local de práctica; alinear
GIDs no es portable entre Windows y Linux.

```powershell
docker run -d `
  --name jenkins `
  --network devops-net `
  -p 8080:8080 `
  -p 50000:50000 `
  -u root `
  -v jenkins_home:/var/jenkins_home `
  -v /var/run/docker.sock:/var/run/docker.sock `
  --restart unless-stopped `
  jenkins/jenkins:lts
```

Contraseña inicial:

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## 3. SonarQube

```powershell
docker run -d `
  --name sonarqube `
  --network devops-net `
  -p 9000:9000 `
  -v sonarqube_data:/opt/sonarqube/data `
  -v sonarqube_logs:/opt/sonarqube/logs `
  -v sonarqube_extensions:/opt/sonarqube/extensions `
  --restart unless-stopped `
  sonarqube:latest
```

Tarda un par de minutos en el primer arranque. Si se reinicia en bucle, la causa
casi siempre es Elasticsearch pidiendo más `vm.max_map_count`:

```powershell
docker logs sonarqube
wsl -d docker-desktop sysctl -w vm.max_map_count=262144
```

## 4. Herramientas dentro de Jenkins

**Este paso no es opcional.** `jenkins/jenkins:lts` trae Java y nada más: sin
Node no hay `pnpm install`, y sin el cliente de Docker no hay `docker build`.

Se instala en el contenedor, no en el volumen, así que **hay que repetirlo cada
vez que se recree el contenedor**. Es idempotente: volver a lanzarlo no rompe
nada.

```powershell
docker exec -u root jenkins bash -c 'set -e && apt-get update -qq && apt-get install -y -qq --no-install-recommends ca-certificates curl gnupg && install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && chmod a+r /etc/apt/keyrings/docker.asc && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y -qq --no-install-recommends docker-ce-cli nodejs && corepack enable && ln -sf /opt/java/openjdk/bin/java /usr/local/bin/java'
```

Van comillas **simples** alrededor del script a propósito: PowerShell expande
`$(...)` dentro de comillas dobles, y se comería el `$(dpkg --print-architecture)`
antes de que bash lo vea.

El `ln -sf` del final arregla un detalle que muerde: la imagen define `JAVA_HOME`
pero **deja su `bin` fuera del `PATH`**. Jenkins llama a java por ruta absoluta y
no se entera, pero el sonar-scanner que invoca la etapa 5 sí, y falla con
`java: command not found`.

Comprobar, en el mismo tipo de shell que usan los pasos del pipeline:

```powershell
docker exec jenkins sh -c "node -v; corepack --version; docker -v; java -version; git --version"
```

Solo se instala el **cliente** de Docker, no el daemon. El pipeline habla con el
del host por el socket montado; que funcione se ve así:

```powershell
docker exec jenkins docker ps
```

## 5. Plugins de Jenkins

*Manage Jenkins → Plugins*:

- SonarQube Scanner for Jenkins
- Pipeline
- Pipeline: Declarative
- Pipeline: Stage View
- Git
- Credentials · Credentials Binding
- JUnit

## 6. SonarQube (`http://localhost:9000`, `admin`/`admin`)

1. **Usuario técnico.** *Administration → Security → Users → Create User*, login
   `jenkins`. En *Administration → Security → Global Permissions* dale **Execute
   Analysis** (y opcionalmente *Browse* y *See Source Code*). No se usa `admin`
   en el pipeline.
2. **Token.** Genéralo desde ese usuario y guárdalo para el paso 7.
3. **Proyectos.** Créalos con **las mismas claves que usa SonarCloud**, que son
   las que ya están en el `sonar-project.properties` de cada repo:
   - `T-cordoba_beverage-ledger`
   - `T-cordoba_beverage-ledger-api`

   Usar las mismas claves es lo que evita duplicar en un archivo paralelo las
   listas de `sonar.coverage.exclusions`, que son el complemento a mano de
   `coverage.include` de `vitest.config.mts` y se desincronizarían.
4. **Webhook.** *Project Settings → Webhooks → Create*, en **cada** proyecto:
   - Name: `Jenkins Quality Gate`
   - URL: `http://jenkins:8080/sonarqube-webhook/`
   - Secret: vacío

   Sin el webhook, `waitForQualityGate` se queda esperando hasta agotar el
   timeout de 10 minutos en vez de recibir el resultado.

## 7. Configurar Jenkins

- *Manage Jenkins → Credentials*: token de SonarQube como **Secret text**.
- *Manage Jenkins → System → SonarQube servers*: nombre **`SonarQube`** (el
  Jenkinsfile lo busca por ese nombre), URL `http://sonarqube:9000`, y el token
  de arriba.
- *Manage Jenkins → Tools → SonarQube Scanner*: instalación automática, nombre
  **`SonarScanner`** (también referenciado por nombre desde el Jenkinsfile).

### Credenciales del despliegue de la API

El pipeline de la API las escribe en un `--env-file` temporal en vez de pasarlas
con `-e`, porque lo que va por `-e` se lee con `docker inspect`. Créalas como
**Secret text** con estos ids exactos:

| Id | Contenido |
|---|---|
| `bl-api-database-url` | `DATABASE_URL` (pooler) |
| `bl-api-direct-url` | `DIRECT_URL` (conexión directa) |
| `bl-api-jwt-secret` | `JWT_SECRET`, mínimo 32 caracteres |

El front no necesita credenciales de ningún tipo: su suite entera corre sin red,
con el transporte stubbeado.

## 8. Crear los dos jobs

Uno por repo, tipo **Pipeline**:

| Job | Repositorio | Rama | Script Path |
|---|---|---|---|
| `beverage-ledger-api` | `beverage-ledger-api` | `ci/jenkins-pipeline` | `Jenkinsfile` |
| `beverage-ledger-front` | `beverage-ledger` | `ci/jenkins-pipeline` | `Jenkinsfile` |

En cada job, *Additional Behaviours → Advanced clone behaviours*: deja
**desmarcado** el clon superficial. SonarQube necesita el historial completo para
atribuir el código y calcular el "new code" sobre el que se evalúa el Quality
Gate; con un clon superficial lo atribuye todo al último commit.

Conviene lanzar primero el de la API: el front horneado apunta a
`http://localhost:3001` y sin la API detrás la app se despliega igual y responde
sana, pero no tiene con quién hablar.

---

## Etapas del pipeline

Las mismas nueve en los dos repos:

| # | Etapa | Qué valida |
|---|---|---|
| 1 | Verify tools | Node, corepack, Docker, Java y Git dentro del agente |
| 2 | Install dependencies | `pnpm install --frozen-lockfile` (+ `db:generate` en la API) |
| 3 | Static analysis | lint, typecheck, y `i18n:check` / `build` según el repo |
| 4 | Tests and coverage | Vitest con cobertura, publicando JUnit y `lcov.info` |
| 5 | SonarQube analysis | `sonar-scanner` contra `http://sonarqube:9000` |
| 6 | Quality gate | `waitForQualityGate abortPipeline: true` |
| 7 | Docker build | Imagen etiquetada `:${BUILD_NUMBER}` y `:latest` |
| 8 | Deploy | `docker run` en `devops-net` |
| 9 | Health check | `curl` con reintentos al endpoint de salud del contenedor |

## Comprobar que el Quality Gate corta de verdad

Que la etapa 6 esté en verde no demuestra que sirva. La prueba es endurecer
temporalmente el Quality Gate en SonarQube, relanzar el job, y verificar que el
build queda en rojo **en esa etapa** y no llega a desplegar.

## Apagar

```powershell
docker stop jenkins sonarqube
docker rm jenkins sonarqube
```

Los volúmenes sobreviven, así que la configuración de Jenkins y el histórico de
SonarQube siguen ahí al volver a crear los contenedores. Las herramientas del
paso 4, no: viven en el contenedor y hay que reinstalarlas.
