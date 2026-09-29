pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    IMAGE          = 'beverage-ledger-front'
    CONTAINER      = 'beverage-ledger-front'
    NETWORK        = 'devops-net'
    HOST_PORT      = '3000'
    APP_PORT       = '3000'

    // The browser resolves this, not the container: even with both services on
    // the same Docker network, the bundle runs on the host and would not
    // resolve `beverage-ledger-api`. It is baked in at build time, so changing
    // it means rebuilding the image.
    PUBLIC_API_URL = 'http://localhost:3001'

    COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
    NEXT_TELEMETRY_DISABLED         = '1'

    VERCEL_IMAGE = 'beverage-ledger-front-vercel'
    VERCEL_URL   = 'https://beverage-ledger.vercel.app'
  }

  stages {
    stage('Verify tools') {
      steps {
        sh '''
          set -e
          node --version
          corepack --version
          docker --version
          java -version
          git --version
        '''
      }
    }

    stage('Install dependencies') {
      steps {
        // corepack reads packageManager from package.json, so the pinned pnpm
        // is used without naming the version here.
        sh '''
          set -e
          corepack enable
          pnpm install --frozen-lockfile
        '''
      }
    }

    stage('Static analysis') {
      steps {
        sh '''
          set -e
          pnpm lint
          pnpm typecheck
          pnpm i18n:check
        '''
      }
    }

    stage('Tests and coverage') {
      steps {
        // The API pipeline stops SonarQube once its gate answers, so this one
        // cannot assume it is up. Starting it here lets it boot while the
        // suite runs.
        sh 'docker start sonarqube || true'
        sh 'pnpm test:coverage --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit.xml'
          // coverage/ is gitignored, so it only survives the build as an artifact.
          archiveArtifacts artifacts: 'coverage/lcov.info', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube analysis') {
      steps {
        sh '''
          for attempt in $(seq 1 60); do
            if curl -fsS http://sonarqube:9000/api/system/status | grep -q '"status":"UP"'; then
              exit 0
            fi
            sleep 5
          done
          echo "SonarQube never came up"
          exit 1
        '''
        script {
          def scannerHome = tool 'SonarScanner'
          // Host and token come from the server configured in Jenkins; every
          // other property stays in sonar-project.properties, which is also
          // what GitHub Actions reads.
          //
          // Two memory limits, because the analyzer otherwise does not fit on a
          // small machine and the box starts swapping — at which point the
          // analysis is no longer CPU-bound and runs for tens of minutes with
          // the CPU idle and the disk pinned.
          //
          // The bridge sizes its Node heap from the memory it sees and asks for
          // 2.2GB on an 8GB host, hence the cap. Disabling type checking is the
          // one that matters here: it skips building a TypeScript program over
          // 291 files, which is the allocation that does not fit. It buys no
          // time on a healthy machine — the sensor takes 43s either way — and
          // it does cost analysis depth, since the rules that need type
          // information stop running. The API keeps the full analysis.
          withSonarQubeEnv('SonarQube') {
            sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectVersion=${env.BUILD_NUMBER} -Dsonar.javascript.node.maxspace=768 -Dsonar.javascript.disableTypeChecking=true"
          }
        }
      }
    }

    stage('Quality gate') {
      steps {
        // Depends on the SonarQube webhook pointing at
        // http://jenkins:8080/sonarqube-webhook/ — without it this waits out
        // the timeout instead of getting an answer.
        timeout(time: 10, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Docker build') {
      steps {
        // The gate has answered; the build is the other memory peak.
        sh 'docker stop sonarqube || true'
        sh '''
          set -e
          docker build \
            --build-arg NEXT_PUBLIC_API_URL="${PUBLIC_API_URL}" \
            --build-arg NEXT_PUBLIC_GOOGLE_SIGN_IN=false \
            -t "${IMAGE}:${BUILD_NUMBER}" \
            -t "${IMAGE}:latest" \
            .
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          set -e
          docker rm -f "${CONTAINER}" 2>/dev/null || true
          docker run -d \
            --name "${CONTAINER}" \
            --network "${NETWORK}" \
            --restart unless-stopped \
            -p "${HOST_PORT}:${APP_PORT}" \
            "${IMAGE}:${BUILD_NUMBER}"
        '''
      }
    }

    stage('Health check') {
      steps {
        // By container name, not localhost: this runs inside Jenkins, whose
        // localhost is its own container.
        sh '''
          set -e
          for attempt in $(seq 1 30); do
            if curl -fsS "http://${CONTAINER}:${APP_PORT}/api/health"; then
              echo ""
              echo "healthy after ${attempt} attempt(s)"
              exit 0
            fi
            sleep 2
          done
          echo "the container never answered /api/health"
          docker logs --tail 50 "${CONTAINER}"
          exit 1
        '''
      }
    }

    stage('Deploy to Vercel') {
      steps {
        // Vercel serves functions and static files, not images, so the
        // container here is the build environment: the CLI inside it builds
        // and uploads a prebuilt output. The source goes in through COPY
        // rather than a bind mount because the Docker daemon is the host's,
        // and the workspace lives in the jenkins_home volume, not on a host path.
        withCredentials([
          string(credentialsId: 'vercel-token', variable: 'DEPLOY_VERCEL_TOKEN'),
          string(credentialsId: 'vercel-org-id', variable: 'DEPLOY_VERCEL_ORG_ID'),
          string(credentialsId: 'vercel-project-id', variable: 'DEPLOY_VERCEL_PROJECT_ID'),
        ]) {
          sh '''
            set -e
            docker build --target vercel -t "${VERCEL_IMAGE}:${BUILD_NUMBER}" .

            umask 077
            cat > .vercel.env <<ENVFILE
VERCEL_TOKEN=${DEPLOY_VERCEL_TOKEN}
VERCEL_ORG_ID=${DEPLOY_VERCEL_ORG_ID}
VERCEL_PROJECT_ID=${DEPLOY_VERCEL_PROJECT_ID}
ENVFILE

            docker run --rm --env-file .vercel.env "${VERCEL_IMAGE}:${BUILD_NUMBER}"
          '''
        }
        sh '''
          set -e
          for attempt in $(seq 1 20); do
            if curl -fsS "${VERCEL_URL}/api/health"; then
              echo ""
              exit 0
            fi
            sleep 5
          done
          echo "${VERCEL_URL} never answered /api/health"
          exit 1
        '''
      }
    }
  }

  post {
    failure {
      sh 'docker logs --tail 100 "${CONTAINER}" 2>/dev/null || true'
    }
    always {
      sh 'rm -f .vercel.env || true'
    }
    cleanup {
      // Keeps the last two tags reachable and drops what the rebuilds orphaned.
      sh 'docker image prune -f --filter "dangling=true" || true'
      sh 'docker rmi "${VERCEL_IMAGE}:${BUILD_NUMBER}" 2>/dev/null || true'
    }
  }
}
