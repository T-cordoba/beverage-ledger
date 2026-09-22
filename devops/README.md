# Pipeline: Jenkins + SonarQube + Docker

Requisitos: Docker Desktop y Git. Comandos en **PowerShell**.

---

## 1. Clonar los dos repos

```powershell
cd C:\VisualProjects
git clone -b ci/jenkins-pipeline https://github.com/T-cordoba/beverage-ledger.git
git clone -b ci/jenkins-pipeline https://github.com/T-cordoba/beverage-ledger-api.git
```

## 2. Crear el `.env` de la API

```powershell
cd C:\VisualProjects\beverage-ledger-api
Copy-Item .env.example .env
```

Rellena `DATABASE_URL`, `DIRECT_URL` y `JWT_SECRET`.

## 3. Crear red y volúmenes

```powershell
docker network create devops-net
docker volume create jenkins_home
docker volume create sonarqube_data
docker volume create sonarqube_logs
docker volume create sonarqube_extensions
```

## 4. Levantar Jenkins

```powershell
docker run -d --name jenkins --network devops-net -p 8080:8080 -p 50000:50000 -u root -v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock --restart unless-stopped jenkins/jenkins:lts
```

## 5. Levantar SonarQube

```powershell
docker run -d --name sonarqube --network devops-net -p 9000:9000 -v sonarqube_data:/opt/sonarqube/data -v sonarqube_logs:/opt/sonarqube/logs -v sonarqube_extensions:/opt/sonarqube/extensions --restart unless-stopped sonarqube:latest
```

## 6. Instalar herramientas dentro de Jenkins

```powershell
docker exec -u root jenkins bash -c 'set -e && apt-get update -qq && apt-get install -y -qq --no-install-recommends ca-certificates curl gnupg && install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && chmod a+r /etc/apt/keyrings/docker.asc && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y -qq --no-install-recommends docker-ce-cli nodejs && corepack enable && ln -sf /opt/java/openjdk/bin/java /usr/local/bin/java'
```

Comprobar:

```powershell
docker exec jenkins sh -c "node -v; corepack --version; docker -v; java -version; git --version"
docker exec jenkins docker ps
```

## 7. Asistente de Jenkins

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

En `http://localhost:8080`:

- Pega la contraseña
- **Install suggested plugins**
- Crea tu usuario admin
- **Save and Finish** → **Start using Jenkins**

## 8. Plugin de SonarQube en Jenkins

*Manage Jenkins → Plugins → Available plugins*

- Buscar `SonarQube Scanner`
- Marcar **SonarQube Scanner for Jenkins** → **Install**
- Marcar **Restart Jenkins when installation is complete**

## 9. Entrar a SonarQube

`http://localhost:9000` con `admin` / `admin`. Pide cambiar la contraseña.

## 10. Crear los dos proyectos

*Projects → Create Project → Local project*, una vez por proyecto.

| Display name | Project key |
|---|---|
| Beverage Ledger (front) | `T-cordoba_beverage-ledger` |
| Beverage Ledger API | `T-cordoba_beverage-ledger-api` |

El **Project key** se autogenera del nombre: edítalo a mano para que quede exacto. Es la clave que ya está escrita en el `sonar-project.properties` de cada repo.

En *New Code Definition* deja **Use the global setting** → **Create project**.

Si la pantalla siguiente ofrece analizar el proyecto, sáltala: el análisis lo lanza el pipeline.

## 11. Crear el usuario técnico

*Administration → Security → Users → Create User*

| Campo | Valor |
|---|---|
| Login | `jenkins` |
| Name | `Jenkins CI` |
| Password | la que quieras |

No se usa `admin` en el pipeline.

## 12. Dar permiso de análisis

*Administration → Security → Global Permissions*

- Buscar el usuario `jenkins`
- Marcar **Execute Analysis**

## 13. Generar el token

*Administration → Security → Users* → fila de `jenkins` → menú **⋮** → **Tokens**

- Name: `jenkins-pipeline`
- Type: **User Token**
- **Generate**

**Copia el token ahora**, no se vuelve a mostrar.

## 14. Crear los webhooks

*Project Settings → Webhooks → Create*, **en cada uno de los dos proyectos**.

| Campo | Valor |
|---|---|
| Name | `Jenkins Quality Gate` |
| URL | `http://jenkins:8080/sonarqube-webhook/` |
| Secret | vacío |

## 15. Credenciales en Jenkins

*Manage Jenkins → Credentials → System → Global credentials → Add Credentials*. Todas **Secret text**.

| ID | Secret |
|---|---|
| `sonarqube-token` | el token del paso 13 |
| `bl-api-database-url` | `DATABASE_URL` del `.env` |
| `bl-api-direct-url` | `DIRECT_URL` del `.env` |
| `bl-api-jwt-secret` | `JWT_SECRET` del `.env` |

## 16. Servidor SonarQube en Jenkins

*Manage Jenkins → System → SonarQube servers → Add SonarQube*

| Campo | Valor |
|---|---|
| Name | `SonarQube` |
| Server URL | `http://sonarqube:9000` |
| Server authentication token | `sonarqube-token` |

## 17. Herramienta SonarScanner

*Manage Jenkins → Tools → SonarQube Scanner installations → Add SonarQube Scanner*

| Campo | Valor |
|---|---|
| Name | `SonarScanner` |
| Install automatically | ✅ |

## 18. Crear los dos jobs

*New Item* → **Pipeline**. Uno por repo.

En la sección *Pipeline*: Definition = **Pipeline script from SCM**, SCM = **Git**, Credentials = *none*.

| Job | Repository URL | Branch Specifier | Script Path |
|---|---|---|---|
| `beverage-ledger-api` | `https://github.com/T-cordoba/beverage-ledger-api.git` | `*/ci/jenkins-pipeline` | `Jenkinsfile` |
| `beverage-ledger-front` | `https://github.com/T-cordoba/beverage-ledger.git` | `*/ci/jenkins-pipeline` | `Jenkinsfile` |

En *Additional Behaviours*, deja **desmarcado** el clon superficial.

## 19. Lanzar

**Build Now** en `beverage-ledger-api`, y cuando esté verde, en `beverage-ledger-front`.

```powershell
docker ps
curl.exe -s http://localhost:3001/api/v1/health
curl.exe -s http://localhost:3000/api/health
```

App en `http://localhost:3000`.

---

## Etapas del pipeline

| # | Etapa |
|---|---|
| 1 | Verify tools |
| 2 | Install dependencies |
| 3 | Static analysis |
| 4 | Tests and coverage |
| 5 | SonarQube analysis |
| 6 | Quality gate |
| 7 | Docker build |
| 8 | Deploy |
| 9 | Health check |

## Notas

- El paso 6 vive en el contenedor, no en el volumen: hay que repetirlo si recreas `jenkins`.
- Los nombres `SonarQube` y `SonarScanner`, las claves de proyecto y los IDs de credenciales los busca el `Jenkinsfile` por nombre exacto.
- En Git Bash, `/var/run/docker.sock` se convierte a ruta de Windows y falla. Usa `//var/run/docker.sock`.
- Sin los webhooks del paso 14, la etapa 6 espera hasta agotar su timeout de 10 minutos.
- SonarQube reiniciándose en bucle: `wsl -d docker-desktop sysctl -w vm.max_map_count=262144`.

## Apagar

```powershell
docker stop jenkins sonarqube
docker rm jenkins sonarqube
```
