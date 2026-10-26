# RF-15 — Salida

## Exploración con Playwright MCP

- Herramientas usadas en la sesión: `browser_navigate`, `browser_snapshot`, `browser_type`, `browser_click`, `browser_generate_locator` y `browser_close`.
- Se comprobó el login real y la navegación de la aplicación. La pantalla de existencias presenta filas de producto y saldos accesibles; la captura de movimientos expone controles para añadir/quitar botella y caja, y selección de bodega.
- Los locators de la suite se basan en roles observables: `listitem`, botones «Añadir/Quitar botella/caja», combobox «Bodega», diálogo de confirmación, búsqueda del historial y `article` del movimiento.

## Casos y resultado final

| Caso                                                                 | Resultado |
| -------------------------------------------------------------------- | --------- |
| Registrar una salida correcta                                        | Aprobada  |
| Sin productos no aparece la barra Confirmar                          | Aprobada  |
| Cantidades incorrectas: quitar por debajo de cero y tope del stepper | Aprobada  |
| Inventario insuficiente por tope compartido botellas/cajas           | Aprobada  |
| Volver del diálogo y Descartar no escriben en el ledger              | Aprobada  |

**Final:** 5 aprobadas, 0 fallidas, 0 omitidas. Los cinco casos pasaron en la primera suite completa y en la ejecución final.

## Inventario y evidencia

Los límites del stepper se derivan del saldo «N en existencia» mostrado en cada tarjeta. El caso de salida compara el saldo final con el saldo real leído antes de confirmar; no se usan saldos fijos.

Resultados finales: [JUnit](../../reports/junit.xml) y [reporte HTML](../../reports/html/index.html). La suite completa se ejecutó con `npx playwright test --config playwright.config.ts`.
