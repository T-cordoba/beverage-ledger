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

---

## 1. Levantar la infraestructura

```powershell
docker network create devops-net
docker compose -f devops/docker-compose.devops.yml up -d --build
```

Contraseña inicial de Jenkins:

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

SonarQube tarda un par de minutos en el primer arranque. Si se reinicia en bucle,
la causa casi siempre es Elasticsearch pidiendo más `vm.max_map_count`:

```powershell
docker logs sonarqube
wsl -d docker-desktop sysctl -w vm.max_map_count=262144
```

## 2. Plugins de Jenkins

*Manage Jenkins → Plugins*:

- SonarQube Scanner for Jenkins
- Pipeline
- Pipeline: Declarative
- Pipeline: Stage View
- Git
- Credentials · Credentials Binding
- JUnit

## 3. SonarQube (`http://localhost:9000`, `admin`/`admin`)

1. **Usuario técnico.** *Administration → Security → Users → Create User*, login
   `jenkins`. En *Administration → Security → Global Permissions* dale **Execute
   Analysis** (y opcionalmente *Browse* y *See Source Code*). No se usa `admin`
   en el pipeline.
2. **Token.** Genéralo desde ese usuario y guárdalo para el paso 4.
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

## 4. Configurar Jenkins

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

## 5. Crear los dos jobs

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
docker compose -f devops/docker-compose.devops.yml down
```

Con `-v` además borra los volúmenes, o sea la configuración de Jenkins y el
histórico de SonarQube.
