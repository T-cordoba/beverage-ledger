# RF-20 — Anulación

## Exploración con Playwright MCP

- Herramientas usadas en la sesión: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_generate_locator` y `browser_close`.
- En el detalle de un movimiento se observan su código, tipo, estado, fecha de anulación y líneas. El diálogo de anulación ofrece «Motivo», «Anular» y «Conservarlo».
- Las pruebas crean y siguen únicamente sus propios movimientos; la fixture los anula automáticamente al terminar si permanecen confirmados.

## Casos y resultado final

| Caso                             | Resultado |
| -------------------------------- | --------- |
| Conservarlo cancela la anulación | Aprobada  |
| Motivo obligatorio al anular     | Aprobada  |
| Anular con motivo válido         | Aprobada  |

**Final:** 3 aprobadas, 0 fallidas, 0 omitidas. La corrida dirigida posterior a la corrección aprobó 3/3; la suite completa final aprobó 3/3.

## Problema y corrección

La primera suite completa falló en la comprobación del estado «confirmado»: el locator estricto resolvía tres badges con el mismo texto en el detalle. El flujo de anulación no había fallado. Se acotó la comprobación a la primera coincidencia visible, sin eliminar la aserción de estado. La corrida dirigida y la final pasaron.

## Inventario y evidencia

El caso de anulación lee el saldo inicial y el saldo posterior de `/stock` y verifica que la entrada temporal se revierte exactamente. No usa un saldo fijo.

Resultados finales: [JUnit](../../reports/junit.xml) y [reporte HTML](../../reports/html/index.html). La suite completa se ejecutó con `npx playwright test --config playwright.config.ts`.
