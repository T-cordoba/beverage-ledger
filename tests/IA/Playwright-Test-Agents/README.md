# Playwright Test Agents — Beverage Ledger

Primera de las tres herramientas de IA evaluadas (ver [`../README.md`](../README.md)).

**Playwright Test Agents** son tres agentes que trae Playwright (desde 1.56) para que
un modelo de lenguaje planifique, escriba y repare pruebas E2E manejando un navegador
real a través de un servidor MCP (`playwright run-test-mcp-server`). Aquí los ejecuta
**Claude Code**, y cubren seis funcionalidades del frontend de Beverage Ledger con
19 pruebas.

| Funcionalidad | Archivo | Pruebas |
|---|---|---|
| RF-15 Salida (OUTBOUND) | `RF15-outbound.spec.ts` | 5 |
| RF-16 Entrada (INBOUND) | `RF16-inbound.spec.ts` | 2 |
| RF-17 Traspaso (TRANSFER) | `RF17-transfer.spec.ts` | 4 |
| RF-18 Ajuste (ADJUSTMENT) | `RF18-adjustment.spec.ts` | 2 |
| RF-20 Anulación | `RF20-cancellation.spec.ts` | 3 |
| RF-21 Comprobante PDF | `RF21-receipt.spec.ts` | 3 |

Resultados, errores corregidos y pendientes: [`RESULTADOS.md`](RESULTADOS.md).

## Los tres agentes

| Agente | Qué hace | Herramientas MCP principales | Qué produjo aquí |
|---|---|---|---|
| **Planner** | Explora la aplicación con el navegador y escribe un plan de pruebas en Markdown (escenarios, pasos, resultados esperados) | `planner_setup_page`, `browser_*`, `planner_save_plan` | `agents/plan-pruebas.md` |
| **Generator** | Recorre cada escenario del plan en el navegador real, registra las acciones y escribe el código de la prueba | `generator_setup_page`, `browser_*`, `generator_read_log`, `generator_write_test` | Las 19 pruebas de `RF*.spec.ts` |
| **Healer** | Ejecuta las pruebas, depura las que fallan inspeccionando la página y corrige el código | `test_run`, `test_debug`, `browser_snapshot`, `browser_generate_locator` | La corrección del selector de historial en RF-15 |

Los tres arrancan desde `seed.spec.ts`: una sesión MANAGER ya iniciada en `/dashboard`.

## Estructura

```text
tests/IA/Playwright-Test-Agents/
├── RF15-outbound.spec.ts … RF21-receipt.spec.ts   las seis suites (19 pruebas)
├── seed.spec.ts               página de partida de los agentes (solo se carga con PW_AGENTS=1)
├── support/
│   ├── fixtures.ts            sesión MANAGER por worker, limpieza del ledger
│   ├── auth-budget.ts         espera para no superar el límite de /auth/refresh (429)
│   ├── env.ts                 URLs, credenciales (de la shell) y guarda de escritura solo en local
│   ├── data.ts                carga movimientos.json
│   ├── movimientos.json       bodegas, notas, motivos, formato del nombre del PDF
│   └── pdf.ts                 lectura y validación del comprobante PDF
├── agents/
│   ├── plan-pruebas.md        plan generado por el Planner (el vigente)
│   ├── planner.prompt.md, generator.prompt.md, healer.prompt.md   prompts de cada agente
│   ├── run-agent.sh           lanza un agente sin interfaz con Claude Code
│   ├── run-generator-suites.sh  Generator una vez por funcionalidad
│   ├── logs/                  prompt + respuesta de cada ejecución real de un agente, y agents.log
│   └── generated-originals/   lo que el Generator escribió para RF-15/16, un archivo por escenario (.txt)
├── reports/
│   ├── html/                  reporte HTML de la última ejecución (con trazas y capturas)
│   ├── junit.xml              JUnit de la última ejecución
│   ├── salida-ultima-ejecucion.txt
│   ├── artifacts/             trazas y capturas sueltas de la última ejecución (no versionado)
│   └── history/               evidencia única de ejecuciones anteriores (ver history/README.md)
├── .claude/agents/            definiciones de los 3 agentes (npx playwright init-agents --loop=claude)
├── .mcp.json                  servidor MCP "playwright-test" que usan los agentes
├── .gitignore                 excluye .playwright-mcp/, reports/artifacts/ y el registro del límite de refresh
├── playwright.config.ts
├── README.md
└── RESULTADOS.md
```

`agents/` y `reports/history/` no hacen falta para ejecutar las pruebas: son la
evidencia de que los agentes se usaron de verdad y de las ejecuciones con fallos que
llevaron a cada corrección.

### Archivos que deben quedar fuera de esta carpeta

Ningún archivo de los agentes necesita estar fuera. Claude Code busca `.claude/agents/`
y `.mcp.json` en el directorio desde el que se lanza, y `run-agent.sh` se coloca en
esta carpeta antes de invocar `claude`. Fuera de aquí solo hay cambios de
configuración compartida del repo, imprescindibles para que convivan las suites:

| Archivo | Cambio | Por qué |
|---|---|---|
| `package.json` / `pnpm-lock.yaml` | `@playwright/test` 1.63.0 en `devDependencies` | La dependencia de la herramienta |
| `vitest.config.mts` | `exclude: [...configDefaults.exclude, 'tests/IA/Playwright-Test-Agents/**']` | Estos archivos son `*.spec.ts` y Vitest los recogería |
| `eslint.config.mjs` | ignora `tests/IA/Playwright-Test-Agents/reports/**` y `.playwright-mcp/**` | No analizar el bundle del reporte HTML ni las capturas del MCP |
| `sonar-project.properties` | `sonar.test.exclusions` de `reports/` y `.playwright-mcp/` | `sonar.tests=tests` incluye esta carpeta; sin esto Sonar analizaría el bundle minificado del reporte |

El navegador Chromium de Playwright se instala en la caché del usuario
(`%LOCALAPPDATA%\ms-playwright`), no en el repo.

## Requisitos

- Node.js 20+ y pnpm (el repo es solo pnpm: no uses `npm install`).
- Docker Desktop.
- Claude Code (`claude`), solo para volver a lanzar los agentes.
- Entorno local desechable. Las pruebas que confirman o anulan movimientos **escriben en el ledger**, así que solo corren si el front y la API son `localhost` (`support/env.ts`). Contra cualquier otro destino se marcan como *skipped*.
  1. Base local: `docker start beverage-ledger-db` (Postgres en `:5434`, con seed demo).
  2. API local en `:3001` (repo `beverage-ledger-api`, `node dist/main` con sus variables en la shell).
  3. Front en `:3000` apuntando a esa API: `NEXT_PUBLIC_API_URL=http://localhost:3001`.
  4. Una segunda bodega, **"Barra E2E"** (la usa RF-17).
  5. Credenciales de un usuario MANAGER **local** en la shell, nunca en un archivo versionado.

## Instalación

```powershell
pnpm install                       # trae @playwright/test 1.63.0
npx playwright install chromium    # navegador de las pruebas
```

## Ejecución (PowerShell, desde la raíz del repo)

```powershell
$env:TEST_USER_EMAIL = 'manager@test.com'
$env:TEST_USER_PASSWORD = '<contraseña del manager local>'

# Listar las 19 pruebas (no escribe reportes)
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts --list

# Las seis funcionalidades
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts

# Una funcionalidad
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts RF15
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts RF16
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts RF17
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts RF18
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts RF20
npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts RF21
```

Variables opcionales: `IA_BASE_URL` (front, por defecto `http://localhost:3000`) e
`IA_API_URL` (API, por defecto `NEXT_PUBLIC_API_URL` o `http://localhost:3001`).

## Reportes

| Qué | Dónde | Cómo abrirlo |
|---|---|---|
| Reporte HTML (con trazas y la captura final de cada prueba) | `reports/html/` | `npx playwright show-report tests/IA/Playwright-Test-Agents/reports/html` |
| JUnit | `reports/junit.xml` | cualquier visor JUnit / Jenkins |
| Salida de consola | `reports/salida-ultima-ejecucion.txt` | |
| Trazas sueltas | `reports/artifacts/<prueba>/trace.zip` | `npx playwright show-trace <ruta>/trace.zip` |
| Ejecuciones anteriores | `reports/history/` | índice en `reports/history/README.md` |

Cada ejecución **reemplaza** `reports/html`, `junit.xml` y `artifacts/`. La vigente
vive solo ahí; al archivarla, muévela (no la copies) a `reports/history/<nn-nombre>/`.

En el repositorio solo se versiona `reports/history/` (sin los HTML con trazas, que
pesan ~65 MB por ejecución). La evidencia del resultado vigente, 19/19, es
`reports/history/07-tras-mover-a-tests/`; ver [`RESULTADOS.md`](RESULTADOS.md).

## Volver a lanzar los agentes

Desde esta carpeta, en Git Bash, con el entorno local levantado:

```bash
cd tests/IA/Playwright-Test-Agents
export TEST_USER_EMAIL=manager@test.com TEST_USER_PASSWORD='<contraseña>'
bash agents/run-agent.sh planner agents/planner.prompt.md <nombre-log>   # escribe agents/plan-pruebas-v2.md
bash agents/run-generator-suites.sh                                       # Generator, una vez por suite
bash agents/run-agent.sh healer  agents/healer.prompt.md  <nombre-log>
```

`run-agent.sh` ejecuta `claude -p --agent playwright-test-<agente> --mcp-config .mcp.json --strict-mcp-config`
y guarda el prompt y la respuesta en `agents/logs/`. Los logs de `agents/logs/` son
históricos: conservan las rutas que existían cuando se ejecutó cada agente (`specs/`,
`generator/*.pw.ts`, `tests/`).

## Problemas conocidos

- **Límite de `/auth/refresh` (429).** La API admite 10 por minuto por IP y la app pide uno en cada carga de página. `support/auth-budget.ts` espera hueco antes de cada `page.goto`, por eso la suite completa tarda unos 6 minutos. No lances dos ejecuciones a la vez, ni una ejecución junto a un agente.
- **`actionTimeout` es obligatorio.** Sin él, Playwright espera sin límite y un agente puede quedarse colgado en un click. La config lo fija en 15 s.
- **`--list` y los reporters.** Playwright ejecuta los reporters incluso al listar. La config solo usa el de consola con `--list`, para no reescribir el último reporte.
- **Credenciales.** Sin `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` en la shell, las 19 pruebas fallan al instante con "Define TEST_USER_EMAIL y TEST_USER_PASSWORD en la shell." y la ejecución reemplaza el último reporte.
- **El plan vigente es la v1.** Una revisión v2 del Planner se interrumpió sin guardar nada. La v1 cita rutas antiguas (`generator/*.pw.ts`) que el prompt del Generator manda ignorar.
- **Solo local.** Las pruebas que escriben se saltan contra Vercel/Render a propósito.
