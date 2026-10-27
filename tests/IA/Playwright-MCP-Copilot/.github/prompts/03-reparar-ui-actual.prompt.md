---
agent: agent
description: Investiga con Playwright MCP por qué fallan las pruebas tras el cambio de interfaz y repáralas
---

La interfaz de Beverage Ledger cambió el 24/10/2026 (campos obligatorios marcados,
textos nuevos, tarjetas de producto que muestran primero las existencias, la captura
ya no pide fecha). Las pruebas `RF*.pw.ts` de este workspace se escribieron contra la
interfaz anterior y la última ejecución completa (26/10/2026) dio:

- Las 19 pruebas fallan en el login de `signIn()` en `support/fixtures.ts`:
  `getByLabel('Contraseña', { exact: true })` ya no encuentra el campo.
- Con el login resuelto fallan además estas 6:
  1. `RF15-outbound.pw.ts` › "Registrar una salida correcta"
  2. `RF15-outbound.pw.ts` › "Cantidades incorrectas: quitar por debajo de cero y tope del stepper"
  3. `RF15-outbound.pw.ts` › "Inventario insuficiente por tope compartido botellas/cajas"
  4. `RF15-outbound.pw.ts` › "Volver del diálogo y Descartar no escriben en el ledger"
  5. `RF16-inbound.pw.ts` › "Validación de la entrada: sin líneas y diálogo con Volver"
  6. `RF17-transfer.pw.ts` › "Cantidades del traspaso topadas por el origen"

Tarea:

1. Lee `requisitos.md` (secciones de los requisitos afectados), `support/fixtures.ts`
   y los archivos de prueba fallidos.
2. **Investiga la interfaz real con Playwright MCP** antes de cambiar código: inicia
   sesión (escribe `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` literalmente), abre
   /login y las pantallas de cada escenario fallido, y usa `browser_snapshot`,
   `browser_generate_locator` y `browser_verify_text_visible` para obtener los nombres
   accesibles y textos actuales (campo de contraseña, diálogo de confirmación, aviso
   de "descartar", aviso del stepper al llegar al tope, fecha del movimiento). Si
   confirmas algún movimiento al explorar, anúlalo después (motivo "Limpieza
   exploración MCP").
3. Corrige `signIn()` en `support/fixtures.ts` (solo esa función) y las 6 pruebas con
   lo que observaste. Reglas:
   - No borres pruebas ni pasos, no uses `test.skip`/`test.fixme` nuevos y no quites
     ni relajes aserciones. Si algo que la prueba verificaba (por ejemplo el aviso de
     tope del stepper o un campo de fecha que ya no existe) se comunica ahora de otra
     forma, verifica la forma nueva con una aserción equivalente o más estricta y
     explica el cambio en el resumen.
   - Si la aplicación se comporta mal de verdad, deja la prueba fallando y explica el
     defecto; no cambies el resultado esperado para que coincida con un error.
   - No toques `playwright.config.ts`, el resto de `support/` ni `requisitos.md`.
4. Cierra el navegador MCP (`browser_close`) y ejecuta cada archivo corregido con
   `npx playwright test <archivo> --config playwright.config.ts`. Como máximo tres
   rondas por archivo. Al final ejecuta una vez la suite completa
   (`npx playwright test --config playwright.config.ts`).
5. Escribe `evidencias/copilot/reparacion-ui-actual-resumen.md`: herramientas MCP
   usadas, lo que observaste en la app, la causa raíz de cada fallo, qué cambiaste
   (archivo y prueba), resultado de cada ejecución y lo que no pudiste resolver.
