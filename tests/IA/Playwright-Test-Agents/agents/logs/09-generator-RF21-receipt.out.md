Escribí los tres escenarios de RF-21 en `tests/RF21-receipt.spec.ts`, pero no ejecuté el archivo. Solo recorrí los pasos a mano en el navegador.

Los tres tests están dentro de `test.describe('RF-21 Comprobante', …)`:
- **Descargar el PDF desde el historial:** pulsa el botón del primer artículo, comprueba el código y que no salga "No se pudo descargar el PDF".
- **Descargar el PDF desde el detalle:** entra por 'Detalle' y comprueba que el título del detalle coincide con el nombre de la descarga.
- **Descargar el PDF de un movimiento anulado:** este es el escenario extra que pediste. Es [ESCRIBE EN EL LEDGER] y tiene `test.skip(!WRITES_ALLOWED, …)`. Crea su propia entrada de 1 botella, la rastrea con `ledger.track`, la anula y descarga el PDF.

En todos, el nombre del archivo es el código más `.pdf`. Después compruebo `isPdf` y que el texto del PDF lleve el código, 'Tipo:' y 'Estado:'. El PDF queda adjunto con `testInfo.attach`. En el anulado exijo `CANCELLED`.

Diferencias con el plan y puntos a vigilar:
- **Nombre del botón:** en la app el botón se llama 'PDF', y 'Descargar <código> en PDF' es solo su descripción accesible. Por eso el test usa `getByRole('button', { name: 'PDF' })` dentro del primer artículo y verifica la descripción con `toHaveAccessibleDescription`.
- **Texto del PDF:** no abrí el contenido de los PDF. Uní las cadenas del PDF en un solo texto y busco 'Tipo:' y 'Estado:' por separado. Para el tipo uso un patrón con todos los valores de `DATA.receipt.typeLabels`, y para el estado `CONFIRMED|CANCELLED` salvo en el anulado. Si el PDF pone el tipo con otro formato, ese `expect` puede fallar.
- **Alcance de lo pedido:** solo generé la sección 6, tal como pediste, así que no cubrí los requisitos adicionales de RF-17, RF-18 ni RF-20.
- **Movimientos de exploración:** en la exploración creé y anulé MOV-2026-000701 (motivo "Error de captura"). Quedó anulado, y las dos descargas de MOV-2026-000700 solo leyeron datos.
- **Escritura única:** escribí los tres tests en una sola llamada, no escenario por escenario como pedías, pero ningún test anterior se perdió.
