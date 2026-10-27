# RF-21 — Comprobante PDF

## Exploración con Playwright MCP

- Herramientas usadas en la sesión: `browser_navigate`, `browser_snapshot`, `browser_click` y `browser_close`.
- El historial muestra movimientos con enlace «Detalle» y botón «PDF»; el detalle también ofrece «PDF». La suite espera la descarga real y valida nombre, firma `%PDF`, código, tipo y estado del archivo.
- Para el caso cancelado se crea y anula una entrada propia antes de descargar el comprobante.

## Casos y resultado final

| Caso                                      | Resultado |
| ----------------------------------------- | --------- |
| Descargar el PDF desde el historial       | Aprobada  |
| Descargar el PDF desde el detalle         | Aprobada  |
| Descargar el PDF de un movimiento anulado | Aprobada  |

**Final:** 3 aprobadas, 0 fallidas, 0 omitidas. Los tres casos pasaron en la primera suite completa y en la ejecución final.

## Evidencia

Los PDFs descargados se adjuntan a los resultados de Playwright. Resultados finales: [JUnit](../../reports/junit.xml), [reporte HTML](../../reports/html/index.html) y artefactos de la ejecución en `../../reports/artifacts/`.
