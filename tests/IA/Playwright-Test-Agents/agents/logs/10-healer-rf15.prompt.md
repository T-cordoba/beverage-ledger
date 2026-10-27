Repara las pruebas Playwright que fallan en esta suite (config `playwright.config.ts`, pruebas en `tests/`).

1. Ejecuta todas las pruebas con test_run para ver cuáles fallan (en la última ejecución falló solo `tests/RF15-outbound.spec.ts` › "Registrar una salida correcta").
2. Para cada prueba fallida usa test_debug, inspecciona la página (browser_snapshot, browser_generate_locator, red y consola) y determina la causa raíz: selector, espera, dato o un defecto real de la aplicación.
3. Corrige SOLO el código de la prueba fallida, con selectores por rol/nombre accesible y aserciones web-first. Vuelve a ejecutarla hasta que pase.

Reglas (obligatorias):
- No borres pruebas, no uses test.skip/test.fixme para ocultar un fallo, no relajes ni quites aserciones de lo que la prueba debe verificar y no cambies el resultado esperado para que coincida con un error de la aplicación. Si la aplicación se comporta mal de verdad, NO lo tapes: deja la prueba fallando y explica el defecto.
- No uses mocks ni page.route para simular respuestas.
- No modifiques `tests/support/*`, `tests/seed.spec.ts`, `test-data/*` ni `playwright.config.ts`.
- La API limita /auth/refresh a 10 por minuto: no ejecutes la suite completa más de lo necesario; prefiere ejecutar solo la prueba que estás reparando.
- Las filas del historial (/movements) son `article`, no `listitem`.

Al terminar, resume para cada prueba: causa raíz, qué cambiaste (archivo y líneas) y el resultado de la última ejecución.
