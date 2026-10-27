Terminé los tres escenarios que faltaban de la sección 1. No pude ejecutar ninguno de los tres tests, porque no tengo una herramienta para lanzar Playwright; los escribí a partir de lo que vi en el navegador.

**Generados en `generator/`:**
- `rf-15-salida-cantidades.pw.ts` (1.3)
- `rf-15-salida-insuficiente.pw.ts` (1.4)
- `rf-15-salida-cancelar.pw.ts` (1.5)

**Omitidos porque ya existían:** `rf-15-salida.pw.ts` (1.1) y `rf-15-salida-validacion.pw.ts` (1.2).

Ninguno de los tres escribe en el ledger, así que no llevan `test.skip` ni `ledger.track`.

**Dónde difieren del plan:**
- **Mensaje de tope:** "Solo quedan N en esta bodega" no es texto visible. Es el atributo `title` del botón `+` deshabilitado, así que lo valido con `toHaveAttribute('title', …)`. Al llegar al tope, N es 0 (lo que queda), no la existencia total.
- **Producto elegido:** en 1.3 y 1.4 el test toma de la página el producto con menos existencia. Hoy es ABSOLUTE ELYX, con 20.
- **1.4, caja:** no hay ningún producto con menos de 12 en la primera página. El test añade botellas hasta que quedan 11 y comprueba que "Añadir caja" queda deshabilitada con "Solo quedan 11 en esta bodega".
- **1.4, bodega:** en "Barra E2E" todos los productos muestran 0 en existencia con los botones deshabilitados. El test comprueba que la etiqueta cambia respecto a la bodega por defecto. No comprueba que el valor sea 0, porque depende de los datos.
- **1.5, historial:** compruebo que el primer código de `/movements` es el mismo antes y después. Solo vale como prueba mientras nadie más registre movimientos durante la ejecución.

Dos aserciones de 1.4 (el texto "quedan N" y el filtro por encabezado tras cambiar de bodega) las razoné sin comprobarlas en el navegador. Si el test falla, empieza por ahí.
