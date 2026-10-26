Escribí los tres escenarios de la sección 5 en `tests/RF20-cancellation.spec.ts`, pero no ejecuté el archivo. Lo único que verifiqué fue cada comportamiento por separado en el navegador.

**Los tres tests, dentro de `test.describe('RF-20 Anulación')`:**
1. **Conservarlo cancela la anulación.**
   - Crea su propia entrada de 1 botella y llega al detalle desde `/movements` con "Detalle".
   - Comprueba el diálogo `¿Anular <código>?`, su texto y el placeholder `¿Por qué se anula?`.
   - Tras "Conservarlo" el diálogo se cierra, el estado sigue "confirmado", no hay toast y "Anular" se sigue ofreciendo.
2. **Motivo obligatorio al anular.**
   - Prueba el motivo vacío ("Este campo no puede quedar vacío."), el que solo tiene espacios (se recorta y da el mismo error) y el de `ab` ("Escribe al menos 4 caracteres.").
   - El diálogo queda abierto, no hay toast y el movimiento sigue "confirmado".
3. **Anular con motivo válido.**
   - Lee la existencia antes, registra la entrada (+1) y la anula con `DATA.reasons.cancellation`.
   - Comprueba el toast "Movimiento anulado" y su texto, el estado "anulado" y "Anulado el".
   - "Anular" desaparece y la existencia vuelve al valor previo.

**Pendiente de comprobar:**
- **Existencias:** el chequeo de existencias de 5.3 no lo probé en el navegador. Reutiliza el patrón de `RF16-inbound.spec.ts`, que busca el producto en la primera página de `/stock`.
- **Colisión de `getByText`:** `getByText('anulado', { exact: true })` podría chocar con otro texto "anulado" de la página, y no lo comprobé.

**Diferencias con el plan:**
- Tras anular, el detalle muestra "Anulado el" y la fecha, pero no muestra el motivo. El plan decía que aparecía, así que no lo afirmé en la aserción.
- Para el "motivo en blanco" usé `DATA.reasons.blank`, y la UI lo trata igual que vacío.

**Qué no hice:**
- **RF-21:** no generé el PDF de un movimiento anulado, porque pediste solo la sección 5. Los escenarios 6.1 y 6.2 quedan pendientes, y también el de `CANCELLED`.
- **RF-17 y RF-18:** esos requisitos adicionales no aplican a esta sección.
- **Ledger:** los dos movimientos de exploración, MOV-2026-000699 y MOV-2026-000700, quedaron anulados. Los tres tests rastrean con `ledger.track` el movimiento que crean, y el teardown anula los que sigan confirmados.
