---
agent: agent
description: Explora con Playwright MCP los escenarios de un requisito y genera su suite Playwright
---

Requisito a cubrir: **${input:requisito:RF-15}** (archivo de salida
`${input:archivo:RF15-outbound.pw.ts}`).

1. Lee la sección de ${input:requisito} en `requisitos.md` y, como apoyo,
   `support/fixtures.ts`, `support/env.ts` y (solo para RF-21) `support/pdf.ts`.
2. **Explora la aplicación real con Playwright MCP** antes de escribir código:
   inicia sesión (escribe `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` literalmente) y
   recorre cada escenario de ${input:requisito} en el navegador: abre las pantallas,
   pulsa los botones, abre los diálogos y lee los mensajes. Usa `browser_snapshot`
   para ver roles y nombres accesibles, `browser_generate_locator` para los elementos
   que usarás en la prueba y `browser_verify_text_visible` para los textos esperados.
   Si confirmas algún movimiento durante la exploración, anúlalo después desde su
   detalle (motivo "Limpieza exploración MCP"). Respeta el límite de navegaciones de
   las instrucciones del workspace.
3. Escribe `${input:archivo}` con un `test.describe('${input:requisito} …')` y
   exactamente las pruebas de `requisitos.md` para ese requisito, con los mismos
   títulos. Usa `test`/`expect` de `./support/fixtures`; llama a `ledger.track(id)`
   con el uuid de la URL tras cada movimiento confirmado; salta las pruebas que
   escriben con `test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON)`. Los saldos se
   leen al inicio de cada prueba, nunca son números fijos.
4. Cierra el navegador MCP (`browser_close`) y ejecuta en la terminal
   `npx playwright test ${input:archivo} --config playwright.config.ts`.
   Si algo falla, averigua la causa real (vuelve a inspeccionar con MCP si hace
   falta) y corrige la prueba sin quitar verificaciones. Como máximo tres rondas.
5. Escribe `evidencias/copilot/${input:requisito}-resumen.md`: herramientas MCP usadas,
   lo que observaste en la app, decisiones de locators, resultado de cada ejecución
   (aprobadas/fallidas) y cualquier fallo que no pudiste resolver con su causa.
