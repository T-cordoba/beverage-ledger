# Resultados — Playwright Test Agents

Entorno de todas las ejecuciones: front `next dev` en `http://localhost:3000`, API
local en `http://localhost:3001`, Postgres desechable en Docker (`beverage-ledger-db`),
usuario MANAGER local, Chromium (Playwright 1.63.0). Ningún dato de producción.

## Adaptación a la interfaz del 24/10/2026 (26/10/2026)

Los cambios de interfaz del 24/10 (campos obligatorios marcados, "historial de
movimientos" en vez de "ledger", tope del stepper explicado en la tarjeta en vez de en
un `title`, la captura ya no pide fecha) rompieron la suite generada contra la
interfaz anterior:

| Ejecución | Qué | Resultado |
|---|---|---|
| `history/09-ui-actual-sin-adaptar/` | La suite de `07`, sin cambios, contra la interfaz nueva | 0 ✓ · 19 ✘ (el login no encuentra "Contraseña") |
| `history/10-login-adaptado-a-mano/` | Solo con `signIn()` adaptado a mano | 12 ✓ · 7 ✘ |
| `history/12-healer-ui-actual/` | Última `test_run` completa del **Healer** tras reparar las 7 | **20 ✓** (las 19 y `seed.spec.ts`), 7,1 min |
| `history/11-colision-con-copilot/` | La suite lanzada a la vez que Copilot ejecutaba la suya | 13 ✓ · 6 ✘ (límite de `/auth/refresh` compartido; no es un fallo de las pruebas) |

`12` es la salida literal de la herramienta `test_run` del MCP en la sesión del Healer
(`agents/logs/11-healer-ui-actual.*`); esa herramienta no escribe `junit.xml`. Los
specs no cambiaron después de ella; la única ejecución posterior es `11`, invalidada
por la colisión, y no se repitió.

| Cambio | Autor |
|---|---|
| `signIn()` en `support/fixtures.ts`: `getByRole('textbox', { name: /^Contraseña/ })` | A mano (infraestructura que el Healer no toca) |
| RF-15 (4 pruebas), RF-16 "Validación de la entrada", RF-17 "Registrar un traspaso…" y "Cantidades… topadas" | **Healer** (`agents/healer-ui-actual.prompt.md`) |

Ninguna aserción se quitó sin reemplazo: los `title` del tope pasan a ser el texto
exacto de la tarjeta, la fecha ausente se verifica (`Ahora` con `toHaveCount(0)` y el
aviso nuevo), y RF-17 compara el destino contra su saldo leído antes del traspaso.

## Última ejecución contra la interfaz anterior

**07 — tras mover la carpeta de `IA/` a `tests/IA/`**, 25/10/2026, desde PowerShell en la raíz del repo:
`npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts`.
Evidencia versionada en `reports/history/07-tras-mover-a-tests/` (`junit.xml`,
`results.json`, `salida-ultima-ejecucion.txt`, `screenshots/`). Duración: 6,2 min, 1 worker.
Su reporte HTML con trazas (65 MB) no se versiona; el `reports/html/` y el
`reports/junit.xml` locales los sobrescribió después una ejecución sin credenciales
(19 errores "Define TEST_USER_EMAIL y TEST_USER_PASSWORD en la shell.") y tampoco se versionan.

| Funcionalidad | Pruebas creadas | Aprobadas | Fallidas | Bloqueadas |
|---|---|---|---|---|
| RF-15 OUTBOUND | 5 | 5 | 0 | 0 |
| RF-16 INBOUND | 2 | 2 | 0 | 0 |
| RF-17 TRANSFER | 4 | 4 | 0 | 0 |
| RF-18 ADJUSTMENT | 2 | 2 | 0 | 0 |
| RF-20 ANULACIÓN | 3 | 3 | 0 | 0 |
| RF-21 COMPROBANTE | 3 | 3 | 0 | 0 |
| **Total** | **19** | **19** | **0** | **0** |

Antes de ejecutar, `--list` reconoció 19 pruebas en 6 archivos, con `seed.spec.ts`
excluido. Después, el ledger local no tenía movimientos de prueba confirmados ni
borradores: la fixture `ledger` anula lo que cada prueba confirmó y no anuló ella.

## Ejecuciones históricas (`reports/history/`)

Índice detallado en [`reports/history/README.md`](reports/history/README.md).

| Carpeta | Qué | Resultado |
|---|---|---|
| `01-baseline-rf15-rf16/` | RF-15/16 recién generados, con el Planner corriendo a la vez | 2 ✓ · 5 ✘ |
| `02-completa-tras-generator/` | Las 19 pruebas recién generadas | 11 ✓ · 8 ✘ |
| `03-tras-arreglar-throttle/` | Tras corregir la fixture (ver E-3) | 18 ✓ · 1 ✘ |
| `04-independientes/RF15-outbound/` | Solo RF-15, tras el Healer | 5 ✓ |
| `04-independientes/RF16-inbound/` | Solo RF-16 | 2 ✓ |
| `04-independientes/RF17-transfer/` | Solo RF-17 | 4 ✓ |
| `04-independientes/RF18-adjustment/` | Solo RF-18 | 2 ✓ |
| `04-independientes/RF20-cancellation/` | Solo RF-20 | 3 ✓ |
| `04-independientes/RF21-receipt/` | Solo RF-21 | 3 ✓ |
| `05-completa-19de19-powershell/` | Las 19 desde PowerShell, antes de reorganizar | 19 ✓ (su HTML se perdió, ver E-9) |
| `06-tras-reorganizacion/` | Las 19 tras reorganizar, aún en `IA/` de la raíz | 19 ✓ |
| `07-tras-mover-a-tests/` | Copia de la última ejecución, ya en `tests/IA/` | 19 ✓ |

## Qué escribió cada agente y qué se hizo a mano

| Pieza | Autor |
|---|---|
| `plans/plan-pruebas.md` (antes `specs/beverage-ledger-movimientos.plan.v1.md`) | **Planner** (explorando la app con el navegador del MCP) |
| Escenarios de RF-15 y RF-16 | **Generator**, un archivo por escenario (originales en `agents/generated-originals/`); reunidos sin cambios en `RF15-outbound.spec.ts` y `RF16-inbound.spec.ts` |
| `RF17-transfer.spec.ts`, `RF18-adjustment.spec.ts`, `RF20-cancellation.spec.ts`, `RF21-receipt.spec.ts` | **Generator**, escribiendo directamente el archivo de cada funcionalidad |
| Selector del historial en RF-15 › "Registrar una salida correcta" | **Healer** (`test_run` → `test_debug` → corrección → nueva ejecución) |
| `tests/support/*`, `playwright.config.ts`, `test-data/`, prompts y scripts de `agents/` | A mano (infraestructura que los agentes tenían prohibido modificar) |
| Ajustes posteriores a código generado | A mano, listados en la tabla de errores (E-5, E-6, E-7) |

Prompts y respuestas literales de cada ejecución de un agente: `agents/logs/`. La
cronología, incluidas las dos ejecuciones interrumpidas: `agents/logs/agents.log`.

## Errores encontrados y corregidos

| # | Error | Tipo | Causa | Corrección |
|---|---|---|---|---|
| E-1 | El Planner (v2) y el Generator de RF-17 se quedaban colgados minutos en una acción del navegador | Automatización | La config no fijaba `actionTimeout`: en Playwright el valor por defecto es **sin límite**, y un click sobre un botón que nunca era accionable esperaba para siempre | `actionTimeout: 15_000` y `navigationTimeout: 30_000` en `playwright.config.ts` (el MCP de los agentes usa la misma config). Se interrumpieron las dos ejecuciones colgadas y se relanzó el Generator |
| E-2 | `pnpm test` (Vitest) recogía los `*.spec.ts` de Playwright | Entorno | Vitest de la raíz usa el patrón por defecto `**/*.spec.ts` | `exclude: [...configDefaults.exclude, 'tests/IA/**']` en `vitest.config.mts`. Vitest sigue 353/353 |
| E-3 | 8 pruebas acababan en `/login` a mitad de la ejecución | Entorno (límite de la API) | La API limita `POST /auth/refresh` a 10/min por IP (`AUTH_THROTTLE`). El access token vive solo en memoria, así que cada `page.goto` hace un refresh; la suite superaba el límite, la API respondía **429** y la app lo trata como sesión terminada. Confirmado en las trazas de red | `tests/support/auth-budget.ts`: antes de cada carga en frío la fixture espera hueco bajo el límite (registro en disco, porque Playwright reinicia el worker tras un fallo). La espera no cuenta contra el timeout de la prueba. Sin tocar el backend |
| E-4 | La limpieza del ledger fallaba en silencio (429) y dejaba movimientos confirmados | Automatización | El teardown ignoraba la respuesta del refresh y del cancel | La limpieza pasa por el mismo presupuesto y falla de forma visible si no puede anular. Los 4 movimientos que quedaron confirmados (MOV-2026-000692, 000694, 000695, 000704, todos creados hoy por la suite o los agentes) se anularon en la base local |
| E-5 | RF-15 › "Registrar una salida correcta": la fila del historial no se encontraba | Automatización | El Generator buscó las filas de `/movements` como `listitem`; son `article` | **Healer**: `getByRole('article')`. Después se reforzó a mano para que la fila sea la del código del movimiento creado por la prueba, no la salida más reciente de cualquiera |
| E-6 | RF-17 usaba una constante local para la bodega de origen | Datos de prueba | `test-data` decía "Bodega por defecto"; en los selectores se llama "Bodega principal (por defecto)" (lo detectó el Generator) | Corregido `test-data/movimientos.json`; la constante ahora sale de `DATA.locations.source` |
| E-7 | `tsc` fallaba en `RF21-receipt.spec.ts` | Automatización | El Generator tipó la descarga con un tipo derivado incorrecto | Tipo `Download` de `@playwright/test` |
| E-8 | ESLint fallaba sobre la carpeta | Entorno | Recorría el bundle del reporte HTML, y la regla `react-hooks` confundía el `use` de las fixtures con un hook | `tests/IA/*/reports/**` y `tests/IA/*/.playwright-mcp/**` en los `ignores` de `eslint.config.mjs`; `eslint-disable` justificado en `fixtures.ts` |
| E-9 | El reporte HTML de la ejecución 19/19 (05) quedó vacío | Automatización | Playwright ejecuta los reporters configurados también con `--list`, y ese comando reescribió `reports/html` (y `junit.xml`) sin pruebas. La evidencia JUnit/JSON/salida de 05 se conservó porque ya estaba copiada en `history/` | La config solo usa el reporter de consola cuando se pasa `--list` (comprobado: un listado ya no toca `reports/`). El HTML vacío se conserva como `history/05-…/html-VACIO-sobrescrito-por-list/`. La ejecución 06 tiene su HTML completo |

**Defectos de la aplicación encontrados: ninguno que haya hecho fallar una prueba.**
No se modificó código del frontend (`src/`) ni del backend.

## Diferencias entre el plan y la aplicación real

El Generator las verificó en el navegador y escribió las aserciones con lo que
realmente hace la aplicación; ninguna oculta un fallo:

- **RF-17**: si falta "Desde" o "Hacia", el botón "Confirmar" queda deshabilitado y no aparece ningún mensaje. La combinación origen = destino no puede formarse: cada selector excluye la bodega elegida en el otro.
- **RF-15 / RF-17**: el aviso "Solo quedan N en esta bodega" no es texto visible, sino el `title` de los botones "Añadir" deshabilitados.
- **RF-18**:
  - Motivo vacío: no se muestra "Un ajuste necesita un motivo…" (la cadena existe en `es.json`); "Confirmar" queda deshabilitado.
  - Motivo corto: "Escribe al menos 4 caracteres.".
  - Motivo solo con espacios: se recorta y sale "Este campo no puede quedar vacío.".
  - Cantidad 0: no aparece la barra de confirmación.
- **RF-20**: tras anular, el detalle muestra "Anulado el", pero no el motivo de la anulación.
- **RF-21**:
  - El botón se llama "PDF"; "Descargar <código> en PDF" es su descripción accesible.
  - El comprobante se valida por contenido: firma `%PDF-`, código del movimiento, "Tipo:" con el tipo en inglés y "Estado:" con CONFIRMED, o CANCELLED en el movimiento anulado.

## Problemas pendientes

1. **El plan vigente es la v1** (`plans/plan-pruebas.md`). La revisión v2 del Planner (sin la sección de autenticación y con rutas nuevas) se interrumpió por E-1 antes de guardar nada. Las rutas `generator/*.pw.ts` que cita la v1 son de su ubicación anterior; el prompt del Generator le indicó ignorarlas. Se puede relanzar con `bash agents/run-agent.sh planner agents/planner.prompt.md <log>` (guardará `plans/plan-pruebas-v2.md`).
2. **Duración.** Por el límite de 10 refresh/min de la API, la suite completa tarda unos 6 minutos: la mayor parte es espera. Navegar dentro de la SPA en vez de usar `page.goto` lo reduciría.
3. **La entrada de RF-18 "Un ajuste necesita un motivo…"** existe en `es.json` pero no se ve en pantalla con el motivo vacío. No se considera defecto: la confirmación queda bloqueada igualmente. Conviene confirmarlo con el equipo.
4. **Un 429 en `/auth/refresh` cierra la sesión en la app.** Un usuario que recargue más de 10 veces por minuto desde la misma IP vuelve a `/login` aunque su sesión sea válida. Es comportamiento de la app combinado con el límite del backend. No se cambió: está fuera del alcance de las pruebas y tocaría reglas de sesión.
5. **Las pruebas que escriben solo corren en local.** Contra Vercel/Render se marcan como *skipped* a propósito (`tests/support/env.ts`).
6. **Cambios fuera de esta carpeta, sin commitear** (detalle en el README, sección "Archivos que deben quedar fuera"):
   - `package.json`/`pnpm-lock.yaml`: `@playwright/test` 1.63.0.
   - `vitest.config.mts` y `eslint.config.mjs`: ver E-2 y E-8.
   - `sonar-project.properties`: `sonar.test.exclusions` para la evidencia de `tests/IA` (la carpeta está dentro de `sonar.tests=tests`).
7. ~~`package-lock.json` modificado~~ y ~~carpetas antiguas `tests/IA/` y `reports/playwright-ia/`~~: resuelto el 25/10/2026 con autorización. El cambio de `package-lock.json` (resincronización por un `npm install`, sin `@playwright/test`) se descartó con `git checkout`, y las dos carpetas se borraron (todo su contenido útil ya estaba aquí). Después, `--list` sigue reconociendo 19 pruebas en 6 archivos, `tsc` no da errores y Vitest lista sus 83 archivos.
8. **Tamaño de la evidencia.** La carpeta ocupa unos 327 MB. Casi todo son trazas (`trace.zip`) y el reporte HTML con trazas incrustadas: `reports/html` 65 MB, `history/05…/artifacts` 64 MB, `history/06…` 129 MB. Solo `reports/artifacts/` y `.playwright-mcp/` están ignorados por git. Antes de un commit conviene decidir si se versionan o se ignoran (`reports/html/`, `reports/history/*/artifacts/`, `reports/history/*/html/`).
