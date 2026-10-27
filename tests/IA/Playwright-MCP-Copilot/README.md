# Playwright MCP + GitHub Copilot — Beverage Ledger

Tercera de las tres herramientas de IA evaluadas (ver [`../README.md`](../README.md)).

**GitHub Copilot en modo agente** (VS Code) maneja un navegador real a través del
servidor **Playwright MCP** (`@playwright/mcp`), explora la aplicación y escribe las
pruebas Playwright a partir de lo que observa. Cubre las mismas seis funcionalidades
y los mismos 19 escenarios que las otras dos herramientas, descritos en
[`requisitos.md`](requisitos.md).

| Funcionalidad | Archivo | Pruebas |
|---|---|---|
| RF-15 Salida (OUTBOUND) | `RF15-outbound.pw.ts` | 5 |
| RF-16 Entrada (INBOUND) | `RF16-inbound.pw.ts` | 2 |
| RF-17 Traspaso (TRANSFER) | `RF17-transfer.pw.ts` | 4 |
| RF-18 Ajuste (ADJUSTMENT) | `RF18-adjustment.pw.ts` | 2 |
| RF-20 Anulación | `RF20-cancellation.pw.ts` | 3 |
| RF-21 Comprobante PDF | `RF21-receipt.pw.ts` | 3 |

Las specs usan la extensión `.pw.ts` para que Vitest no las recoja.

## Cómo trabaja Copilot aquí

1. `.vscode/mcp.json` registra el servidor `playwright` (`@playwright/mcp@0.0.83`, Chrome,
   `--secrets .env`, evidencia en `evidencias/mcp/`, sesión guardada).
2. `.github/copilot-instructions.md` fija las reglas: solo herramientas `browser_*` del
   MCP, explorar antes de escribir, credenciales nunca en claro (Copilot escribe
   literalmente `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` y el MCP los sustituye),
   respetar el límite de `/auth/refresh` y anular lo que cree al explorar.
3. Los prompts de `.github/prompts/` se envían a Copilot Chat:

| Prompt | Para qué |
|---|---|
| `00-verificar-conexion` | Comprobar que Copilot puede usar el MCP, sin escribir archivos |
| `00-smoke-mcp` | Entrar a la app e inspeccionar una pantalla |
| `01-generar-rf` | Explorar y generar la suite de un requisito |
| `02-generar-suite` | Explorar y generar las seis suites en una sola sesión |

`support/enviar-a-copilot.ps1 -Prompt <nombre>` envía un prompt a la ventana de VS Code
de esta carpeta y `support/exportar-sesion-copilot.mjs <sessionId> <nombre>` copia una
sesión de Copilot a `evidencias/copilot/` con su transcripción legible.

## Estructura

```text
tests/IA/Playwright-MCP-Copilot/
├── RF15-outbound.pw.ts … RF21-receipt.pw.ts   las seis suites (19 pruebas)
├── requisitos.md              escenarios que recibe Copilot
├── support/
│   ├── fixtures.ts            sesión MANAGER compartida, detección de 429, anulación de lo registrado
│   ├── auth-budget.ts         espera para no superar el límite de /auth/refresh
│   ├── env.ts                 URLs, credenciales (shell o .env) y guarda de escritura solo en local
│   ├── data.ts, movimientos.json   datos de los escenarios
│   ├── pdf.ts                 lectura y validación del comprobante PDF
│   ├── enviar-a-copilot.ps1, exportar-sesion-copilot.mjs   utilidades descritas arriba
├── evidencias/
│   ├── copilot/               sesiones exportadas, resumen por requisito y de la suite completa
│   └── mcp/                   registro de acciones del MCP (session.md) y snapshots de página (.yml)
├── reports/
│   ├── html/                  reporte HTML de cada ejecución (local, no se versiona)
│   └── junit.xml              JUnit de la ejecución final (19/19)
├── .github/                   instrucciones y prompts de Copilot
├── .vscode/mcp.json           servidor Playwright MCP
├── .gitignore
├── playwright.config.ts
└── README.md
```

## Requisitos

- Node.js 20+ y pnpm; `@playwright/test` 1.63.0 ya está en `package.json`.
  Navegador: `npx playwright install chromium`.
- Para volver a generar con IA: VS Code con GitHub Copilot (modo agente) y Google Chrome.
- El mismo entorno local desechable que las otras herramientas (Postgres en Docker,
  API en `:3001`, front en `:3000` apuntando a ella, segunda bodega "Barra E2E").
  Las pruebas que escriben en el ledger se saltan si el front o la API no son `localhost`.
- Credenciales de un usuario MANAGER local en la shell (`TEST_USER_EMAIL`,
  `TEST_USER_PASSWORD`) o en `tests/IA/Playwright-MCP-Copilot/.env`, que la regla
  `.env*` del repo deja fuera de git. El servidor MCP lee ese mismo `.env`.

## Ejecución (PowerShell)

```powershell
$env:TEST_USER_EMAIL = 'manager@test.com'
$env:TEST_USER_PASSWORD = '<contraseña del manager local>'

# Desde la raíz del repo
npx playwright test --config=tests/IA/Playwright-MCP-Copilot/playwright.config.ts

# Una funcionalidad
npx playwright test --config=tests/IA/Playwright-MCP-Copilot/playwright.config.ts RF21

# Reporte
npx playwright show-report tests/IA/Playwright-MCP-Copilot/reports/html
```

Variables opcionales: `IA_BASE_URL` (front) e `IA_API_URL` (API). Cada ejecución
reemplaza `reports/html` y `reports/junit.xml`. Solo se versiona `reports/junit.xml`:
el reporte HTML registra el texto de cada paso `fill`, contraseña incluida, así que
`reports/html/`, igual que `reports/artifacts/` (trazas y PDF sueltos) y
`reports/.refresh-log.json`, queda fuera de git.

## Resultados

Ejecuciones reales contra el entorno local (26/10/2026), detalladas en
[`evidencias/copilot/suite-completa-resumen.md`](evidencias/copilot/suite-completa-resumen.md):

| Ejecución | Resultado |
|---|---|
| Primera suite completa generada por Copilot | 17 ✓ · 2 ✘ (RF-17 comparaba el destino con el saldo del origen; RF-20 tenía un locator ambiguo del estado "confirmado") |
| RF-17 y RF-20 tras la corrección | 4/4 y 3/3 |
| Suite completa final ([`reports/junit.xml`](reports/junit.xml)) | **19/19** (6,5 min, 1 worker) |

Resumen por requisito: `evidencias/copilot/RF15-resumen.md` … `RF21-resumen.md`.

Esas ejecuciones son contra la interfaz anterior al 24/10/2026; `reports/junit.xml`
sigue siendo la de 19/19.

### Interfaz del 24/10/2026: reparación incompleta

| Ejecución (26/10/2026) | Resultado |
|---|---|
| `reports/history/02-login-adaptado-a-mano/`: `signIn()` adaptado a mano, specs sin tocar | 13 ✓ · 6 ✘ (los mismos 6 textos/`title` que en Playwright Test Agents) |
| `reports/history/03-reparacion-copilot-no-adoptada/`: tras la sesión de Copilot con `.github/prompts/03-reparar-ui-actual.prompt.md` | 17 ✓ · 2 ✘ |

En la sesión del prompt 03, Copilot (modo agente, MAI-Code-1.1-Flash) reescribió `signIn()`
con `getByRole('textbox', { name: /Contraseña/i })`. Ese cambio se adoptó: con él las
19 pruebas pasan el login en `03`. Sus cambios a `RF15`, `RF16` y `RF17` **no se
adoptaron** porque debilitan aserciones, que el prompt prohibía: textos exactos
reemplazados por `/1 producto/` o por alternativas como
`/No se envió nada al ledger|Se descartó|Borrador descartado/`, y los `title` del tope
eliminados sin una aserción equivalente. Por eso el JUnit de `03` no corresponde a los
specs versionados. Los specs versionados siguen siendo los de 19/19 contra la interfaz
anterior; con la interfaz actual se espera el resultado de `02`, que no se ha vuelto a
ejecutar con el `signIn()` de Copilot. La sesión no se exportó porque quedó esperando un
permiso sin cerrar.

## Evidencia de uso de la IA

- `evidencias/copilot/00-smoke.*` y `01-verificar-conexion.*`: sesiones de Copilot
  exportadas (eventos originales y transcripción con las llamadas a `playwright-browser_*`).
- `evidencias/mcp/*/session.md` y `page-*.yml`: lo que el servidor MCP registró
  durante la exploración y la generación (acciones y snapshots de accesibilidad).
- La sesión de generación de la suite no se exportó como transcripción de Copilot;
  su rastro está en el registro del MCP y en los resúmenes de `evidencias/copilot/`.
