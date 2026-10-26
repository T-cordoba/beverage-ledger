# RF-18 — Ajuste

## Exploración con Playwright MCP

- Herramientas usadas en la sesión: `browser_navigate`, `browser_snapshot`, `browser_click` y `browser_close`.
- La captura de ajuste permite restar unidades, presenta el campo «Motivo» y aplica validación del mínimo de caracteres. El detalle confirma el tipo, motivo y delta de la línea.
- Los locators usan la tarjeta de producto con «Quitar botella», el textbox «Motivo» y el diálogo «¿Confirmar este ajuste?».

## Casos y resultado final

| Caso                                        | Resultado |
| ------------------------------------------- | --------- |
| Motivo obligatorio de al menos 4 caracteres | Aprobada  |
| Registrar un ajuste con motivo válido       | Aprobada  |

**Final:** 2 aprobadas, 0 fallidas, 0 omitidas. Ambas pasaron en la primera suite completa y en la ejecución final.

## Inventario y evidencia

El caso que registra el ajuste lee el saldo inicial de la fila de existencias en la interfaz y comprueba la disminución de una unidad; no fija el saldo del producto.

Resultados finales: [JUnit](../../reports/junit.xml) y [reporte HTML](../../reports/html/index.html). La suite completa se ejecutó con `npx playwright test --config playwright.config.ts`.
