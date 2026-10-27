---
agent: agent
description: Genera y ejecuta, en una sola sesión y en orden, las suites de RF-16, 17, 18, 20, 21 y 15 explorando la app con Playwright MCP
---

Vas a generar la suite completa de Beverage Ledger (19 pruebas) **en esta misma sesión,
un requisito detrás de otro**, en este orden: RF-16, RF-17, RF-18, RF-20, RF-21 y RF-15.

| Requisito | Archivo | Pruebas |
|---|---|---:|
| RF-16 | `RF16-inbound.pw.ts` | 2 |
| RF-17 | `RF17-transfer.pw.ts` | 4 |
| RF-18 | `RF18-adjustment.pw.ts` | 2 |
| RF-20 | `RF20-cancellation.pw.ts` | 3 |
| RF-21 | `RF21-receipt.pw.ts` | 3 |
| RF-15 | `RF15-outbound.pw.ts` | 5 |

Lee primero `.github/copilot-instructions.md`, `requisitos.md`, `support/fixtures.ts`,
`support/env.ts` y `support/pdf.ts` con la herramienta de lectura de archivos (nunca con
el navegador: son archivos locales, no páginas web).

**Paso 0 — comprobación de Playwright MCP.** Con `browser_navigate` abre
`http://localhost:3000/login`, inicia sesión escribiendo literalmente `TEST_USER_EMAIL`
y `TEST_USER_PASSWORD` y comprueba que llegas a `/dashboard`. Si las herramientas
`browser_*` no están disponibles o no puedes navegar, detente y dilo.

**Para cada requisito, en el orden de la tabla:**

1. Explora con Playwright MCP cada escenario de ese requisito en `requisitos.md`:
   recorre las pantallas usando los enlaces de la app, abre los diálogos, observa los
   mensajes y usa `browser_snapshot`, `browser_generate_locator` y
   `browser_verify_text_visible`. Si confirmas un movimiento al explorar, anúlalo desde
   su detalle con el motivo "Limpieza exploración MCP".
2. Escribe el archivo con un `test.describe('<requisito> …')` y exactamente las pruebas de
   `requisitos.md`, con los mismos títulos. Usa `test`/`expect` de `./support/fixtures`,
   `ledger.track(id)` tras cada movimiento confirmado y
   `test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON)` en las pruebas que escriben.
   Ningún saldo fijo: lee el valor al inicio y compara contra él.
3. Cierra el navegador MCP (`browser_close`) y ejecuta en la terminal
   `npx playwright test <archivo> --config playwright.config.ts`. Si algo falla, busca la
   causa real (vuelve a mirar la app con MCP) y corrige la prueba sin quitar
   verificaciones; como máximo tres ejecuciones por requisito.
4. Escribe `evidencias/copilot/<requisito>-resumen.md`: herramientas MCP usadas, lo que
   observaste, decisiones de locators y el resultado de cada ejecución (aprobadas /
   fallidas, con la causa de lo que no pudiste resolver).
5. Pasa al siguiente requisito sin esperar confirmación.

Al terminar los seis, ejecuta la suite completa una vez con
`npx playwright test --config playwright.config.ts` y escribe
`evidencias/copilot/suite-completa-resumen.md` con el total de aprobadas y fallidas.
Respeta el límite de navegaciones de las instrucciones del workspace y no ejecutes dos
comandos de Playwright a la vez.
