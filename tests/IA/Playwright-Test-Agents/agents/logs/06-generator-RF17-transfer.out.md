Escribí en `tests/RF17-transfer.spec.ts` los cuatro escenarios de "RF-17 Traspaso" dentro de un único `describe`. No he ejecutado el archivo completo. Sí ejecuté a mano en el navegador los pasos de cada escenario y escribí las aserciones con lo observado.

Los escenarios de la sección 3 son:
- **Origen y destino obligatorios**
- **El destino excluye al origen**
- **Registrar un traspaso y verificar las dos puntas** (`[ESCRIBE EN EL LEDGER]`)
- **Cantidades del traspaso topadas por el origen**

**Qué hace la aplicación y qué aserté:**
- **Falta 'Desde' o 'Hacia':** la barra aparece y "Confirmar" queda con `aria-disabled=true`. No hay mensaje "Un traspaso necesita un origen/destino". Con solo 'Desde' sigue bloqueado y se habilita al elegir también 'Hacia'.
- **Origen = destino:** nunca se puede dejar el destino en una combinación inválida. 'Hacia' no ofrece la bodega de origen y 'Desde' no ofrece el destino elegido. Aserté ambas exclusiones, no un destino que se limpia.
- **Traspaso real:** el detalle muestra "Traspaso", "Líneas (2)", "-1 unidad base" y "1 unidad base". En /stock, 1942 pasó de 65 a 64 en el origen y de 0 a 1 en 'Barra E2E'. Anulé ese movimiento de exploración (MOV-2026-000697) al terminar.
- **Tope:** el aviso "Solo quedan N en esta bodega" no es texto visible. Es el atributo `title` de los botones "Añadir" deshabilitados, y la tarjeta muestra "N en existencia · quedan 0". El test lo comprueba con `toHaveAttribute('title', …)`. Quitar por debajo de cero deja el contador en 0 sin deshabilitar el botón, y la barra desaparece.
- **Elección del producto en el tope:** el test toma el producto de la primera página con menor existencia ≥ 12. Añade cajas y botellas hasta el tope, así que comprueba también que ambos comparten el mismo stock.

**Cosas que debes revisar:**
- **Nombre de la bodega de origen:** `DATA.locations.source` ("Bodega por defecto") no coincide con ningún `option` de los selectores 'Desde' y 'Hacia'. Ahí la bodega se llama "Bodega principal (por defecto)". "Bodega por defecto" solo aparece como etiqueta del filtro de /stock. Como no puedo tocar `test-data`, definí una constante local `SOURCE_OPTION` con un comentario. Conviene corregir el JSON.
- **Toast:** "Movimiento registrado" desapareció antes de que pudiera verificarlo a mano. El test lo asierta justo después del click, pero no lo vi en el navegador.
- **Requisitos de RF-18, RF-20 y RF-21:** no los generé. "3. RF-17 Traspaso" es solo la sección 3 del plan, y esos requisitos pertenecen a las secciones 4, 5 y 6. Si los quieres, dime a qué archivo van.
