Crea el plan de pruebas E2E del frontend de Beverage Ledger (Next.js, interfaz en español) que corre en http://localhost:3000 contra una API local desechable.

Seed: `e2e/seed.pw.ts` (deja una sesión de rol MANAGER ya iniciada en /dashboard). Usa planner_setup_page con ese seed.

Explora la aplicación con el navegador y planifica escenarios positivos, negativos y de validación para:

- RF-15 Salida (/movements/new/outbound): registrar una salida; validar lo obligatorio (sin productos no aparece la barra Confirmar); cantidades incorrectas (quitar por debajo de cero, el tope del stepper "Añadir botella" en lo que hay en existencia: "Solo quedan N en esta bodega"); inventario insuficiente; mensajes de confirmación ("¿Confirmar esta salida?", toast "Movimiento registrado").
- RF-16 Entrada (/movements/new/inbound): registrar, validar formulario, mensaje de éxito, visualizar el movimiento en su detalle e historial.
- RF-17 Traspaso (/movements/new/transfer): origen y destino obligatorios ("Desde", "Hacia"), el destino excluye al origen, cantidades, mensajes y resultado visual (dos puntas). Existen al menos dos bodegas (una se llama "Barra E2E").
- RF-18 Ajuste (/movements/new/adjustment): motivo obligatorio de al menos N caracteres, mensajes de error y de éxito.
- RF-20 Anulación (detalle /movements/{id} de un movimiento confirmado): diálogo "¿Anular …?", motivo obligatorio, "Conservarlo" cancela la operación, el estado pasa a "anulado".
- RF-21 Comprobante: botón "PDF" en el historial y en el detalle; la descarga se llama "<código>.pdf".
- Autenticación (/login, sin sesión): login correcto, incorrecto (usa un correo que NO exista, nunca una contraseña mala de manager@test.com: la cuenta se bloquea a los 5 fallos), campos vacíos, sesión expirada (sin cookie de refresh, una ruta protegida devuelve a /login), navegación según permisos del rol MANAGER (ve Panel, Existencias, Movimientos, Catálogo, Reportes; no Administración, y /admin/users muestra "No tienes acceso a esta sección.").

Reglas para explorar:
- NO confirmes movimientos ni anules nada mientras exploras: llega hasta el diálogo de confirmación y pulsa "Volver" / "Conservarlo". Los textos de éxito están en ../../src/i18n/messages/es.json.
- No cierres sesión ni hagas logins (hay throttling de 10 logins/minuto).
- Prefiere selectores por rol y nombre accesible; anota los textos exactos que viste.

Guarda el plan con planner_save_plan en `specs/beverage-ledger-movimientos.plan.md`. Cada escenario debe indicar el archivo destino con sufijo `.pw.ts` dentro de `e2e/` (por ejemplo `e2e/rf-15-salida.pw.ts`), el seed `e2e/seed.pw.ts`, si escribe en el ledger, pasos y resultados esperados. Escribe el plan en español.
