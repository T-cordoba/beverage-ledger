# RF-17 — Traspaso

## Exploración con Playwright MCP

- Herramientas usadas: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_generate_locator` y `browser_close`.
- La pantalla de existencias permite filtrar por bodega. Se observaron saldos reales distintos para el producto «1942 DON JULIO»: 189 unidades en origen y 15 en «Barra E2E». Tras el traspaso observado, el destino mostraba 16.
- Los combobox «Desde» y «Hacia» excluyen la bodega opuesta. La suite espera que cierre el listbox antes de abrir el otro selector.

## Casos y resultado final

| Caso                                             | Resultado |
| ------------------------------------------------ | --------- |
| Origen y destino obligatorios                    | Aprobada  |
| El destino excluye al origen                     | Aprobada  |
| Registrar un traspaso y verificar las dos puntas | Aprobada  |
| Cantidades del traspaso topadas por el origen    | Aprobada  |

**Final:** 4 aprobadas, 0 fallidas, 0 omitidas. La corrida dirigida posterior a la corrección aprobó 4/4; la suite completa final aprobó 4/4.

## Problema y corrección

La corrida inicial falló al comparar el total del destino con el saldo inicial del origen (esperaba 190 y observó 16). Era una aserción incorrecta: las bodegas tienen saldos independientes. Se modificó el caso para leer desde la interfaz ambos saldos iniciales y validar por separado `origen - 1` y `destino + 1`. La corrida dirigida y la final confirmaron el ajuste.

## Inventario y evidencia

El saldo inicial/final por bodega se lee desde `/stock`, filtrando producto y bodega; además, el saldo de origen mostrado en la captura se contrasta con el valor inicial.

Resultados finales: [JUnit](../../reports/junit.xml) y [reporte HTML](../../reports/html/index.html). La suite completa se ejecutó con `npx playwright test --config playwright.config.ts`.
