La prueba «Registrar una salida correcta» en `tests/RF15-outbound.spec.ts` fallaba y ahora pasa. Las otras cuatro pruebas del archivo ya pasaban en la ejecución completa y no las toqué.

- **Causa raíz:** el selector. Al final de la prueba busca la fila del historial en `/movements` con `getByRole('listitem')`, pero esas filas son `article`. Por eso no encontraba nada y agotaba los 15 s en `toBeVisible`. No es un defecto de la aplicación: el stock bajó y el movimiento se registró bien, porque el fallo ocurrió en el último paso.
- **Cambio:** en la línea 55 de `tests/RF15-outbound.spec.ts`, `getByRole('listitem')` pasó a `getByRole('article')`. Las aserciones de `Salida` y `confirmado` siguen intactas.
- **Última ejecución:** solo esa prueba (`RF15-outbound.spec.ts:10`), 1 pasada en 37 s. No volví a lanzar la suite completa, para no gastar el límite de 10 por minuto de `/auth/refresh`.

No pude leer el snapshot de la página fallida porque el contexto de error no lo incluía. La causa sale de lo que me indicaste sobre los `article` y de que la prueba pasa con el cambio.
