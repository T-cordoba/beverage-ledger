Las 20 pruebas de la suite completa pasan: 19 de RF más `seed.spec.ts`. No hizo falta `test.skip` ni `test.fixme`, no borré pasos y no usé mocks. Ninguna de las 7 falló por un defecto real de la aplicación; todas eran cambios de interfaz o de datos.

**Login (`support/fixtures.ts`, `signIn`, líneas 16-17)**
- **Causa:** el campo de contraseña ahora tiene el nombre accesible "Contraseña (obligatorio)", por la marca de campo obligatorio. `getByLabel('Contraseña', { exact: true })` ya no lo encontraba.
- **Cambio:** uso `getByRole('textbox', { name: /^Correo electrónico/ })` y `getByRole('textbox', { name: /^Contraseña/ })`. Es un patrón con inicio fijo, así que no choca con el botón "Mostrar la contraseña".
- **Resultado:** las 19 pruebas vuelven a pasar el login.

**1. RF15 › Registrar una salida correcta**
- **Causa:** cambió el texto del diálogo de confirmación. Antes decía "Esto escribe 1 producto en el ledger…" y ahora "Esto registra 1 producto en el historial de movimientos y mueve 1 unidad…".
- **Cambio:** actualicé el texto esperado en `RF15-outbound.spec.ts`, línea 37.
- **Resultado:** pasa.

**2. RF15 › Cantidades incorrectas: quitar por debajo de cero y tope del stepper**
- **Causa:** el botón "+" deshabilitado ya no lleva el atributo `title` "Solo quedan 0 en esta bodega". El tope ahora se explica con un texto en la tarjeta, dentro de una región `aria-live` (`ProductPicker.limitMessage`). Al tomar todo el stock dice "Ya tomaste las N unidades que hay en la bodega de origen."
- **Cambio:** en `RF15-outbound.spec.ts` (alrededor de las líneas 118-124) quité las dos aserciones de `title`. Conservé las de `toBeDisabled` en botella y caja y añadí una aserción de visibilidad del texto nuevo, con el stock leído de la página.
- **Resultado:** pasa.

**3. RF15 › Inventario insuficiente por tope compartido botellas/cajas**
- **Causa:** la misma que en la 2; el tooltip de "Añadir caja" pasó a ser un texto en la tarjeta.
- **Cambio:** en `RF15-outbound.spec.ts` (alrededor de las líneas 150-160) sustituí la aserción de `title` por el texto "Quedan N unidades: no alcanza para otra caja, pero sí para botellas sueltas." Contempla "Queda 1 unidad" y el caso de 0 existencias.
- **Resultado:** pasa.

**4. RF15 › Volver del diálogo y Descartar no escriben en el ledger**
- **Causa:** cambió el aviso tras descartar. Antes decía "No se envió nada al ledger." y ahora "No se registró nada."
- **Cambio:** actualicé el texto esperado en `RF15-outbound.spec.ts`, línea 215.
- **Resultado:** pasa.

**5. RF16 › Validación de la entrada: sin líneas y diálogo con Volver**
- **Causa:** la captura ya no pide fecha. Ya no existen el botón "Ahora" ni la pista "Déjalo vacío para registrarlo como ahora."
- **Cambio:** en `RF16-inbound.spec.ts`, líneas 85-87, verifico el texto "Se registrará con la fecha y hora actuales." y que no exista el botón "Ahora" (`toHaveCount(0)`). No se limita a quitar la aserción: comprueba que la forma nueva está y que la vieja ya no.
- **Resultado:** pasa.

**6. RF17 › Registrar un traspaso y verificar las dos puntas**
- **Causa:** el dato dejó de ser cierto. La bodega destino ya tenía 15 unidades del producto, así que tras el traspaso mostraba 16 y no "1 unidad".
- **Cambio:** en `RF17-transfer.spec.ts` (aprox. líneas 80-117 y 150-170) extraje la selección de origen y destino a `chooseEnds` y añadí una lectura previa del saldo del destino en `/stock`, filtrado por esa bodega. Ahora la prueba exige `destinationBefore + 1` en el destino y `sourceBefore - 1` en el origen, con una regex que no confunde "6 unidad" con "16 unidades". También comprueba que el producto leído antes es el mismo que se traspasa.
- **Resultado:** pasa.

**7. RF17 › Cantidades del traspaso topadas por el origen**
- **Causa:** la misma que en la 2; el tooltip del tope pasó a ser un texto en la tarjeta.
- **Cambio:** en `RF17-transfer.spec.ts` (aprox. líneas 211-216) sustituí las dos aserciones de `title` por el texto "Ya tomaste las N unidades que hay en la bodega de origen." Mantuve las de `toBeDisabled`.
- **Resultado:** pasa.

Un `test_run` de la prueba RF15 de la línea 125 devolvió una salida vacía varias veces seguidas. Lo atribuyo a la espera por el límite de refresh de la API, pero no lo comprobé. Esa prueba pasó al ejecutar el archivo RF15 completo y en la suite final.
