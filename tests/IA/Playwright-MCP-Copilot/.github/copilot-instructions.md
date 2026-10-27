# Contexto para GitHub Copilot — suite Playwright MCP + Copilot

Este workspace es la tercera herramienta de IA del proyecto de V&V de Beverage Ledger:
GitHub Copilot (modo agente) explora la aplicación real con el servidor **Playwright
MCP** (`.vscode/mcp.json`) y escribe/mantiene pruebas Playwright a partir de lo que
observa. Los escenarios están en `requisitos.md` (19 en total).

## Reglas

- **Solo Playwright MCP para el navegador.** Usa exclusivamente las herramientas
  `browser_*` del servidor MCP `playwright` (`browser_navigate`, `browser_snapshot`,
  `browser_click`, `browser_type`, …). No uses el navegador integrado de VS Code
  (`openBrowserPage`, `typeInPage`, `clickElement`, `readPage`, `runPlaywrightCode`):
  no sustituye los secretos y no cuenta como evidencia. Si las herramientas `browser_*`
  no están disponibles, detente y dilo en vez de buscar otra vía.
- **Explora antes de escribir.** Cada locator y cada texto esperado tiene que salir de
  lo que devolvieron las herramientas MCP (`browser_snapshot`, `browser_generate_locator`,
  `browser_verify_*`), no de suposiciones.
- **Credenciales:** nunca las leas ni las escribas. En el login escribe literalmente
  `TEST_USER_EMAIL` en "Correo electrónico" y `TEST_USER_PASSWORD` en "Contraseña": el
  servidor MCP los sustituye por los valores reales (`--secrets`). No abras `.env`.
- **Límite de la API:** `/auth/login` y `/auth/refresh` admiten 10 peticiones por minuto
  por IP, y cada `browser_navigate` (carga en frío) gasta un refresh. Navega dentro de
  la app con clics en enlaces siempre que puedas y no hagas más de 5 `browser_navigate`
  por minuto. Si la app te devuelve a `/login`, espera 60 s y vuelve a entrar.
- **Datos:** solo `http://localhost:3000` (API `:3001`), entorno local desechable. Si
  durante la exploración confirmas un movimiento, anúlalo después desde su detalle
  ("Anular", motivo "Limpieza exploración MCP"). No anules movimientos que no creaste.
- **Pruebas:** archivos `RFxx-<nombre>.pw.ts` en la raíz de este workspace, con
  `test`/`expect` de `./support/fixtures` (sesión Manager compartida, presupuesto de
  refresh, anulación automática de lo que registres con `ledger.track(id)`).
  Las pruebas que escriben llevan `test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON)`
  (de `./support/env`). No uses cantidades de inventario fijas: lee el saldo al inicio
  y compara contra él. No borres aserciones para que una prueba pase.
- **Ejecución:** cierra el navegador MCP (`browser_close`) antes de correr la suite, y
  ejecútala con `npx playwright test <archivo> --config playwright.config.ts` desde
  este workspace. Una sola ejecución a la vez.
- **Código:** identificadores y comentarios en inglés; títulos de prueba en español,
  exactamente como en `requisitos.md`. Comentarios solo para explicar el porqué.
- **Evidencia:** al terminar cada tarea escribe un resumen en `evidencias/copilot/`
  (herramientas MCP usadas, qué observaste, qué escribiste, resultado de la ejecución).
