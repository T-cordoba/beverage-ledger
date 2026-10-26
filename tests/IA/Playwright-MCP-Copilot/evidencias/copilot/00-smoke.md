# Prueba de humo Copilot + Playwright MCP

- Herramientas MCP usadas, en orden:
  1. `browser_navigate` a `http://localhost:3000/login`.
  2. `browser_snapshot` del formulario de inicio de sesión.
  3. `browser_type` en «Correo electrónico» con `TEST_USER_EMAIL`.
  4. `browser_type` en «Contraseña» con `TEST_USER_PASSWORD`.
  5. `browser_click` en «Entrar».
  6. `browser_snapshot` para comprobar `/dashboard`.
  7. `browser_snapshot` de la navegación principal.
  8. `browser_click` en «Movimientos».
  9. `browser_snapshot` del historial.
  10. `browser_click` en «Registrar una salida».
  11. `browser_snapshot` de la pantalla de salida.
  12. `browser_generate_locator` para «Añadir botella» del primer producto.
  13. `browser_take_screenshot` guardado como `evidencias/copilot/00-smoke.png`.
  14. `browser_close`.
- URL final: `http://localhost:3000/movements/new/outbound`
- Primer producto: `1942`
- Existencia observada: `190 en existencia`
- Locator generado:
  ```ts
  getByRole('listitem').filter({ hasText: '1942TEQUILA & OTHER AGAVE' }).getByLabel('Añadir botella')
  ```
