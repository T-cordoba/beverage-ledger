Generé los dos escenarios de la sección 2 (RF-16 Entrada), pero no ejecuté ninguno de los dos archivos como test. Solo recorrí los pasos en el navegador para armarlos.

- **2.1 Registrar una entrada y verla en detalle e historial:** `generator/rf-16-entrada.pw.ts`.
  - Escribe en el ledger, así que lleva el `test.skip(!WRITES_ALLOWED, …)` y llama a `ledger.track(id)` al llegar a `/movements/<id>`. No anula el movimiento él mismo, así que lo anula el teardown.
  - Comprueba el toast, que la existencia suba 12 en `/stock`, la fila del historial y el detalle.
- **2.2 Validación de la entrada: sin líneas y diálogo con Volver:** `generator/rf-16-entrada-validacion.pw.ts`.
  - No escribe en el ledger. Comprueba que sin productos no hay botón Confirmar y que "Ocurrió el" arranca en "Ahora".
  - Escribe una nota, abre el diálogo y pulsa Volver. Al final comprueba que el último código del historial no cambió.

Qué comprobé de verdad en el navegador:
- **2.1:** la entrada de 1 caja se registró como MOV-2026-000694 y el detalle mostró "Líneas (1)", "Registrado por" Manager Katalon (local) y estado confirmado.
- **No pude ver el toast:** ya había desaparecido cuando tomé la captura. Lo dejé como aserción igual que en `rf-15-salida.pw.ts`.
- **2.1, existencia:** esa verificación quedó sin hacer en vivo, porque lancé dos navegaciones a la vez y la de `/stock` la pisó la otra. El `+12` y la búsqueda por código en el historial salen de lo que vi antes y después, no de haberlos ejecutado.
- **2.2:** pasé por todos los pasos hasta pulsar Volver, pero no vi el diálogo cerrarse ni el historial sin cambios; esas aserciones también son de diseño.

Un detalle sobre los selectores que usé:
- **Historial:** las filas son `article` y el botón de descarga se llama "PDF", no "Descargar … en PDF". Usé `getByRole('article')` en 2.1.
- **Otros tests:** `rf-15-salida.pw.ts` busca las filas del historial como `listitem`, lo que podría no coincidir con la página actual.
