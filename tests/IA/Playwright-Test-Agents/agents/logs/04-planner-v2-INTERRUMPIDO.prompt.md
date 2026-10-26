Revisa y reescribe el plan de pruebas E2E del frontend de Beverage Ledger (Next.js, interfaz en español) que corre en http://localhost:3000 contra una API local desechable.

Parte del plan anterior `specs/beverage-ledger-movimientos.plan.v1.md` (léelo primero) y guarda el plan nuevo con planner_save_plan en `specs/beverage-ledger-movimientos.plan.md`.

Seed: `tests/seed.spec.ts` (deja una sesión de rol MANAGER ya iniciada en /dashboard). Usa planner_setup_page con ese seed.

Cambios obligatorios respecto al plan anterior:
1. Alcance: SOLO las seis funcionalidades RF-15 Salida, RF-16 Entrada, RF-17 Traspaso, RF-18 Ajuste, RF-20 Anulación y RF-21 Comprobante. Elimina la sección de Autenticación.
2. Archivo destino: todos los escenarios de una funcionalidad van al MISMO archivo, dentro de `tests/`:
   - RF-15 → `tests/RF15-outbound.spec.ts`
   - RF-16 → `tests/RF16-inbound.spec.ts`
   - RF-17 → `tests/RF17-transfer.spec.ts`
   - RF-18 → `tests/RF18-adjustment.spec.ts`
   - RF-20 → `tests/RF20-cancellation.spec.ts`
   - RF-21 → `tests/RF21-receipt.spec.ts`
   El seed de cada sección es `tests/seed.spec.ts`.
3. RF-15 y RF-16 ya están automatizados: conserva sus escenarios y títulos tal cual (solo cambia el archivo destino).
4. Verifica en el navegador lo que el plan anterior dejó SIN comprobar y corrige los textos con lo que veas de verdad:
   - RF-17: que "Barra E2E" y "Bodega por defecto" aparecen en los selectores 'Desde' y 'Hacia'; si el destino excluye al origen; qué impide confirmar cuando falta una punta (mensaje exacto o botón ausente/deshabilitado). Nota: en "Barra E2E" todas las existencias son 0, así que el origen de un traspaso que escribe debe ser "Bodega por defecto".
   - RF-18: mensajes reales de motivo vacío / corto y cómo se introduce la cantidad con signo.
   - RF-20: abre el detalle de un movimiento confirmado (desde /movements → 'Detalle'), pulsa 'Anular' y anota el diálogo real (título, texto, campo 'Motivo', botones, validación de motivo vacío o corto), y ciérralo con 'Conservarlo'. Anota también cómo se ve un movimiento ya anulado en el historial y en el detalle (filtra o busca uno con estado anulado si existe).
   - RF-21: el nombre accesible real del botón PDF en el historial y en el detalle.
5. RF-21 debe validar además el CONTENIDO del comprobante: la descarga es un PDF real (empieza por `%PDF-`) y su texto contiene el código del movimiento, "Tipo:" con el tipo en inglés (OUTBOUND, INBOUND, TRANSFER o ADJUSTMENT) y "Estado:" con CONFIRMED o CANCELLED. Para eso las pruebas usan el helper `readPdfText()` de `tests/support/pdf.ts` (léelo). Incluye un escenario que descargue el comprobante de un movimiento ANULADO y compruebe "CANCELLED", y que el nombre del archivo coincida con el código.
6. RF-20 debe incluir: seleccionar un movimiento confirmado, el diálogo de confirmación, que 'Conservarlo' no anula (estado sigue 'confirmado'), motivo obligatorio, anulación real con motivo válido que cambia el estado a 'anulado' y deja de ofrecer 'Anular', y que las existencias vuelven. Los escenarios que anulan deben crear primero su PROPIO movimiento (p. ej. una entrada de 1 botella), nunca anular uno ajeno.
7. Los datos de prueba (bodegas, notas, motivos) están en `test-data/movimientos.json`, expuestos por `tests/support/data.ts` como `DATA`: cítalos en los pasos.

Reglas para explorar:
- NO confirmes movimientos ni anules nada mientras exploras: llega hasta el diálogo y pulsa "Volver" / "Conservarlo". Los textos están en ../../src/i18n/messages/es.json.
- No cierres sesión ni hagas logins (hay throttling de 10 logins/minuto).
- Prefiere selectores por rol y nombre accesible; anota los textos exactos que viste y separa lo verificado de lo no verificado.
- Marca con [ESCRIBE EN EL LEDGER] los escenarios que confirman o anulan.

Escribe el plan en español.
