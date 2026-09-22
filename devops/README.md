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

## 7. Aprovisionar SonarQube

Espera a que responda `GREEN`:

```powershell
curl.exe -s -u admin:admin http://localhost:9000/api/system/health
```

Proyectos:

```powershell
curl.exe -s -u admin:admin -X POST "http://localhost:9000/api/projects/create" -d "project=T-cordoba_beverage-ledger" -d "name=Beverage Ledger (front)"
curl.exe -s -u admin:admin -X POST "http://localhost:9000/api/projects/create" -d "project=T-cordoba_beverage-ledger-api" -d "name=Beverage Ledger API"
```

Usuario técnico y permiso:

```powershell
curl.exe -s -u admin:admin -X POST "http://localhost:9000/api/users/create" -d "login=jenkins" -d "name=Jenkins CI" -d "password=JenkinsCI-2026!local"
curl.exe -s -u admin:admin -X POST "http://localhost:9000/api/permissions/add_user" -d "login=jenkins" -d "permission=scan"
```

Token — **copia el valor `token` de la respuesta**:

```powershell
curl.exe -s -u admin:admin -X POST "http://localhost:9000/api/user_tokens/generate" -d "login=jenkins" -d "name=jenkins-pipeline"
```

Webhooks:

```powershell
curl.exe -s -u admin:admin -X POST "http://localhost:9000/api/webhooks/create" -d "name=Jenkins Quality Gate" -d "url=http://jenkins:8080/sonarqube-webhook/" -d "project=T-cordoba_beverage-ledger"
curl.exe -s -u admin:admin -X POST "http://localhost:9000/api/webhooks/create" -d "name=Jenkins Quality Gate" -d "url=http://jenkins:8080/sonarqube-webhook/" -d "project=T-cordoba_beverage-ledger-api"
```

## 8. Asistente de Jenkins

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

En `http://localhost:8080`: pega la contraseña → **Install suggested plugins** → crea tu usuario admin → **Save and Finish**.

## 9. Plugin de SonarQube

*Manage Jenkins → Plugins → Available plugins* → `SonarQube Scanner` → instalar → marcar **Restart Jenkins when installation is complete**.

## 10. Credenciales

*Manage Jenkins → Credentials → System → Global credentials → Add Credentials*. Todas **Secret text**.

| ID | Secret |
|---|---|
| `sonarqube-token` | el token del paso 7 |
| `bl-api-database-url` | `DATABASE_URL` del `.env` |
| `bl-api-direct-url` | `DIRECT_URL` del `.env` |
| `bl-api-jwt-secret` | `JWT_SECRET` del `.env` |

## 11. Servidor SonarQube

*Manage Jenkins → System → SonarQube servers → Add SonarQube*

| Campo | Valor |
|---|---|
| Name | `SonarQube` |
| Server URL | `http://sonarqube:9000` |
| Token | `sonarqube-token` |

## 12. Herramienta SonarScanner

*Manage Jenkins → Tools → SonarQube Scanner installations → Add*

| Campo | Valor |
|---|---|
| Name | `SonarScanner` |
| Install automatically | ✅ |

## 13. Crear los dos jobs

*New Item* → **Pipeline**. Uno por repo.

| Job | Repository URL | Branch | Script Path |
|---|---|---|---|
| `beverage-ledger-api` | `https://github.com/T-cordoba/beverage-ledger-api.git` | `*/ci/jenkins-pipeline` | `Jenkinsfile` |
| `beverage-ledger-front` | `https://github.com/T-cordoba/beverage-ledger.git` | `*/ci/jenkins-pipeline` | `Jenkinsfile` |

En *Pipeline*: Definition = **Pipeline script from SCM**, SCM = **Git**, Credentials = *none*.

## 14. Lanzar

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
- Los nombres `SonarQube` y `SonarScanner` y los IDs de credenciales los busca el `Jenkinsfile` por nombre exacto.
- En Git Bash, `/var/run/docker.sock` se convierte a ruta de Windows y falla. Usa `//var/run/docker.sock`.
- Sin el webhook del paso 7, la etapa 6 espera hasta agotar su timeout de 10 minutos.
- SonarQube reiniciándose en bucle: `wsl -d docker-desktop sysctl -w vm.max_map_count=262144`.

## Apagar

```powershell
docker stop jenkins sonarqube
docker rm jenkins sonarqube
```
