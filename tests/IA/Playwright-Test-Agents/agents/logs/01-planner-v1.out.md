He guardado el plan en `specs/beverage-ledger-movimientos.plan.md`. Cubre RF-15, 16, 17, 18, 20, 21 y autenticación, con 21 escenarios en 6 suites. Todos usan el seed `e2e/seed.pw.ts`. Cada escenario lleva su archivo `.pw.ts` en `e2e/`, y los que escriben en el ledger están marcados con "[ESCRIBE EN EL LEDGER]".

Solo exploré con el navegador la salida, el traspaso, el ajuste y el historial. No confirmé ni anulé nada. Llegué al diálogo de confirmación de la salida y lo cerré con "Volver".

**Anotado en el plan, con textos verificados**
- **Tarjetas de producto:** el producto "1942" tiene 55 en existencia y su caja es de 12 unidades. El stepper de botellas y el de cajas tienen nombres accesibles "Añadir botella" y "Quitar botella", y "Añadir caja" y "Quitar caja".
- **Barra de captura:** al añadir una botella aparecen "Ver el resumen", "Descartar" y "Confirmar".
- **Diálogo de salida:** "¿Confirmar esta salida?" con el texto "Esto escribe 1 producto en el ledger y mueve 1 unidad — las cajas cuentan según su tamaño." y los botones "Volver" y "Confirmar".
- **Historial:** cada fila trae el enlace del código, un enlace "Detalle" y el botón "Descargar MOV-2026-000691 en PDF".
- **Traspaso:** tiene los campos "Desde" ("Elige un origen") y "Hacia" ("Elige un destino").

**Sin verificar en el navegador**
- Los textos de éxito y de anulación salen de `es.json`: "Movimiento registrado", "Movimiento anulado" y "Solo quedan {count} en esta bodega".
- El motivo mínimo de 4 caracteres sale del código (`MIN_REASON_LENGTH = 4`).
- No abrí el detalle de un movimiento, así que el botón "PDF" del detalle y el diálogo "¿Anular …?" en pantalla no los he comprobado.
- No comprobé que "Barra E2E" aparezca en los selectores, que el destino excluya al origen, ni qué mensaje sale al enviar el login vacío o con credenciales malas. Esos escenarios describen el comportamiento esperado y habrá que ajustarlos al ejecutarlos.

**Para quien escriba los tests**
- El borrador se guarda en `localStorage` por tipo de movimiento. Cada prueba debe limpiarlo o pulsar "Descartar" para ser independiente. Al navegar justo después de abrir el diálogo, la salida quedó con una botella pendiente.
- El login incorrecto usa un correo inexistente. Nunca uses `manager@test.com` con una contraseña mala, porque la cuenta se bloquea a los 5 fallos.
- El plan prevé 1 login correcto en total, muy por debajo del límite de 10 por minuto.
exit=0
