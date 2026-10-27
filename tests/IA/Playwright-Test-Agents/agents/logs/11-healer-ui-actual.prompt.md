Repara las pruebas Playwright de esta suite (config `playwright.config.ts`, pruebas `RF*.spec.ts` en la raíz de esta carpeta) para que funcionen con la interfaz ACTUAL de la aplicación. La interfaz cambió el 24/10/2026 (campos obligatorios marcados, textos nuevos, tarjetas de producto que muestran primero las existencias, la captura ya no pide fecha). Las pruebas se generaron contra la interfaz anterior.

Estado de partida (última ejecución completa, 26/10/2026):
- Las 19 pruebas fallan en el login de la fixture `managerContext` (`support/fixtures.ts`, función `signIn`): `getByLabel('Contraseña', { exact: true })` ya no encuentra el campo.
- Con el login resuelto fallaron además estas 7:
  1. `RF15-outbound.spec.ts` › "Registrar una salida correcta"
  2. `RF15-outbound.spec.ts` › "Cantidades incorrectas: quitar por debajo de cero y tope del stepper"
  3. `RF15-outbound.spec.ts` › "Inventario insuficiente por tope compartido botellas/cajas"
  4. `RF15-outbound.spec.ts` › "Volver del diálogo y Descartar no escriben en el ledger"
  5. `RF16-inbound.spec.ts` › "Validación de la entrada: sin líneas y diálogo con Volver"
  6. `RF17-transfer.spec.ts` › "Registrar un traspaso y verificar las dos puntas"
  7. `RF17-transfer.spec.ts` › "Cantidades del traspaso topadas por el origen"

Pasos:
1. Arregla primero el login en `signIn()` de `support/fixtures.ts`. Para ver la página usa test_debug sobre una prueba e inspecciona /login con browser_snapshot y browser_generate_locator.
2. Para cada una de las 7 pruebas: usa test_debug, inspecciona la página (browser_snapshot, browser_generate_locator, red y consola) y determina la causa raíz: selector, texto cambiado, espera, dato o defecto real de la aplicación.
3. Corrige el código de la prueba con selectores por rol/nombre accesible y aserciones web-first, y vuelve a ejecutar solo esa prueba hasta que pase.
4. Al final ejecuta una vez la suite completa con test_run.

Reglas (obligatorias):
- Conserva la cobertura de RF-15, RF-16, RF-17, RF-18, RF-20 y RF-21. No borres pruebas ni pasos, no uses test.skip/test.fixme, no relajes ni quites aserciones. Si un comportamiento que la prueba verificaba (por ejemplo, el aviso de que el stepper llegó al tope) ahora se comunica de otra forma en la interfaz, verifica la forma nueva con una aserción equivalente o más estricta; no lo sustituyas por nada.
- No cambies el resultado esperado para que coincida con un error de la aplicación. Si la aplicación se comporta mal de verdad, deja la prueba fallando y explica el defecto.
- Si una prueba depende de datos que ya no son ciertos (por ejemplo, que la bodega destino empezaba sin stock), haz la comprobación relativa al saldo leído antes del movimiento, sin perder la verificación.
- No uses mocks ni page.route para simular respuestas.
- De `support/` solo puedes modificar la función `signIn` de `support/fixtures.ts`. No modifiques el resto de `support/*`, `seed.spec.ts`, `support/movimientos.json` ni `playwright.config.ts`.
- No escribas credenciales en ningún archivo: vienen de TEST_USER_EMAIL y TEST_USER_PASSWORD.
- La API limita /auth/refresh a 10 por minuto: no ejecutes la suite completa más de lo necesario; prefiere ejecutar solo la prueba que estás reparando.
- Las filas del historial (/movements) son `article`, no `listitem`.

Al terminar, resume para cada prueba: causa raíz, qué cambiaste (archivo y líneas) y el resultado de la última ejecución.
