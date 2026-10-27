# RF-16 — Entrada

## Exploración con Playwright MCP

- Herramientas: `browser_navigate`, `browser_snapshot`, `browser_type`, `browser_click` y `browser_close`.
- El login mostró los campos accesibles «Correo electrónico» y «Contraseña»; al escribir `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` se llegó a `/dashboard`.
- La entrada añade una caja como 12 unidades base; el detalle muestra el código `MOV-…`, la línea y el estado. El diálogo «Volver» conserva el borrador sin registrar movimiento.
- Locators de la prueba: tarjeta `listitem` con botón «Añadir caja», búsqueda de historial «Buscar movimientos por código», y encabezado principal con el código del movimiento.

## Casos y resultado final

| Caso                                                      | Resultado |
| --------------------------------------------------------- | --------- |
| Registrar una entrada y verla en detalle e historial      | Aprobada  |
| Validación de la entrada: sin líneas y diálogo con Volver | Aprobada  |

**Final:** 2 aprobadas, 0 fallidas, 0 omitidas. Ambas pasaron también en la primera suite completa.

## Inventario y evidencia

El caso registra el saldo inicial desde la fila de existencias de la interfaz y compara contra `before + 12`; no depende de una cantidad predefinida.

Resultados finales: [JUnit](../../reports/junit.xml) y [reporte HTML](../../reports/html/index.html). La suite completa se ejecutó con `npx playwright test --config playwright.config.ts`.
