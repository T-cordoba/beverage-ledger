---
agent: agent
description: Prueba de humo — Copilot usa Playwright MCP para entrar a Beverage Ledger e inspeccionar una pantalla
---

Prueba de humo de la integración GitHub Copilot + Playwright MCP. No modifiques
ningún archivo salvo el resumen del último paso.

Usa solo las herramientas `browser_*` del servidor MCP `playwright`, nunca el
navegador integrado de VS Code (`openBrowserPage`, `typeInPage`, `runPlaywrightCode`…).
Si `browser_navigate` no está disponible, detente y responde "Playwright MCP no
disponible" sin hacer nada más.

1. Con las herramientas del servidor MCP `playwright`, abre `http://localhost:3000/login`
   y toma un `browser_snapshot`.
2. Inicia sesión: escribe literalmente `TEST_USER_EMAIL` en "Correo electrónico" y
   `TEST_USER_PASSWORD` en "Contraseña" (el servidor MCP los sustituye) y pulsa "Entrar".
   Verifica con `browser_verify_text_visible` o un snapshot que llegaste a `/dashboard`.
3. Entra a la pantalla de registrar una salida (`/movements/new/outbound`) usando la
   navegación de la app, toma un snapshot y anota el nombre y la existencia ("N en
   existencia") del primer producto. Usa `browser_generate_locator` sobre su botón
   "Añadir botella".
4. Toma una captura con `browser_take_screenshot` (nombre de archivo
   `evidencias/copilot/00-smoke.png`) y cierra el navegador con `browser_close`.
5. Escribe `evidencias/copilot/00-smoke.md` con: las herramientas MCP que usaste en
   orden, la URL final, el producto y la existencia observados y el locator generado.
