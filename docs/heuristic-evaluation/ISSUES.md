# Evaluación heurística — issues y correcciones

Hallazgos de la evaluación heurística de usabilidad, deduplicados. Cuando varias observaciones describen el mismo problema se agrupan bajo un único id y se cita cada una.

Estados: **Pendiente** · **En curso** · **Corregido** · **Fuera de alcance**.

| Id | Issue | Estado |
|---|---|---|
| [H-01](#h-01) | El texto del spinner gira con él | Corregido |
| [H-02](#h-02) | No hay personalización visual de la organización | Corregido (logo fuera de alcance) |
| [H-03](#h-03) | El empleado no puede personalizar nada; no hay opciones de accesibilidad | Corregido |
| [H-04](#h-04) | No hay deshacer/rehacer al capturar un movimiento | Corregido |
| [H-05](#h-05) | No hay botón de volver al registrar un movimiento | Corregido |
| [H-06](#h-06) | Los campos obligatorios no se marcan | Corregido |
| [H-07](#h-07) | La búsqueda no tolera errores tipográficos, desorden ni acentos | Corregido |
| [H-08](#h-08) | Categorías, marcas y bodegas están escondidas en Administración | Corregido |
| [H-09](#h-09) | Las cards de licores no se escanean | Corregido |
| [H-10](#h-10) | Errores en inglés o crudos del backend | Corregido |
| [H-11](#h-11) | Validaciones solo en el backend; la fecha manual del movimiento sobra | Corregido |
| [H-12](#h-12) | No hay documentación de uso | Corregido |
| [H-13](#h-13) | No se entiende por qué el contador no deja aumentar la cantidad | Corregido |
| [H-14](#h-14) | No hay opción de ayuda | Corregido |
| [H-15](#h-15) | Atajos de teclado escasos y no documentados | Corregido |
| [H-16](#h-16) | Los desplegables largos no tienen búsqueda | Corregido |
| [H-17](#h-17) | Los errores de formulario solo aparecen al salir del campo | Corregido |
| [H-18](#h-18) | No hay indicador de que el borrador se está guardando | Corregido |
| [H-19](#h-19) | "Ledger" es jerga para usuarios nuevos | Corregido |
| [H-20](#h-20) | Tema claro, alto contraste y tamaño de texto (alias de H-03) | Corregido |

---

## H-01
**El texto del spinner gira con él**

- **Dónde:** todo indicador de carga con etiqueta (guard de sesión, login, detalle de movimiento, kardex, selector de productos…).
- **Observado:** el spinner muestra un texto que gira junto con el anillo, cuando solo debería verse el spinner.
- **Corrección:** la etiqueta sale del elemento animado y queda solo para lectores de pantalla (`sr-only`). Se quitó el `aria-label` duplicado, que hacía que se anunciara dos veces.

## H-02
**No hay personalización visual de la organización**

- **Pregunta del instrumento:** ¿El usuario puede personalizar su espacio personal o de trabajo del sistema?
- **Observado:** "Se permiten personalizaciones de datos pero no visuales. La aplicación permite personalizar las marcas, productos, nombre de la empresa, pero el cambio del logo no es funcional, no se pueden cambiar los colores de la marca, no se puede personalizar el dashboard para que muestre la información que quiera en el orden que quiera."
- **Corrección:**
  - Color de marca por organización (`organizations.brand_color`), editable en Organización y aplicado como color de acento de la aplicación.
  - Dashboard configurable: cada usuario muestra, oculta y reordena las tarjetas; se guarda por dispositivo.
- **Fuera de alcance:** la subida de logo. Hoy el logo es una URL; subir un archivo exige almacenamiento de objetos en la API, que queda para una iteración posterior.

## H-03
**El empleado no puede personalizar nada; no hay opciones de accesibilidad**

- **Pregunta del instrumento:** ¿El usuario puede personalizar su espacio personal o de trabajo del sistema?
- **Observado:**
  - "Se puede personalizar cosas de la organización, pero no se puede personalizar nada como empleado."
  - "No hay accesibilidad como opción de mayor contraste o variantes de tamaño de texto."
- **Corrección:** página **Ajustes** por usuario con tema (claro, oscuro, sistema), alto contraste y tamaño de texto (pequeño, normal, grande, muy grande). Se guarda en el dispositivo y se aplica antes del primer pintado, sin parpadeo.

## H-04
**No hay deshacer/rehacer al capturar un movimiento**

- **Pregunta del instrumento:** ¿Existen funcionalidades para "deshacer" y "rehacer"?
- **Dónde:** Movimientos · nuevo · salida (y los demás tipos).
- **Observado:**
  - "A pesar de que se guarda el borrador si se sale de la acción, no hay forma de deshacer o rehacer un cambio dentro de la acción; sí se puede luego hacer un ajuste de un movimiento pero después de que ya fue hecho."
  - "Al hacer cualquier movimiento no hay acciones de deshacer y rehacer."
- **Corrección:** historial de cambios del borrador con botones Deshacer/Rehacer y los atajos Ctrl+Z, Ctrl+Y y Ctrl+Shift+Z.

## H-05
**No hay botón de volver al registrar un movimiento**

- **Pregunta del instrumento:** ¿Es fácil volver a un estado anterior de la aplicación?
- **Dónde:** Movimientos · nuevo · salida.
- **Observado:** "A pesar de que siempre está disponible la navegación y el icono que devuelve al dashboard, no hay forma visible de volver a donde se estaba antes de entrar a la acción."
- **Corrección:** enlace "Volver" en la pantalla de captura, que regresa a la pantalla anterior o, si se entró directo, al historial. Es el mismo componente que ya usaban el detalle de movimiento y el kardex.

## H-06
**Los campos obligatorios no se marcan**

- **Pregunta del instrumento:** ¿Queda claro qué hay que introducir en cada campo de un formulario?
- **Observado:** "A simple vista no se puede ver si algo es obligatorio; la única forma es dejarlo en blanco y que se resalte. No se tiene el estándar del asterisco para campos obligatorios."
- **Corrección:** asterisco en la etiqueta de todo campo obligatorio, anunciado como "(obligatorio)" a lectores de pantalla, y una leyenda "* Campo obligatorio" en cada formulario.

## H-07
**La búsqueda no tolera errores tipográficos, desorden ni acentos**

- **Pregunta del instrumento:** ¿El motor de búsqueda tolera errores tipográficos y ortográficos?
- **Observado:**
  - "absinthe no aparece con absenta."
  - "No acepta errores tipográficos medios/altos, como escribir un nombre en desorden."
- **Corrección (API):** la búsqueda de productos y existencias ignora acentos y mayúsculas, compara cada palabra por separado (el orden ya no importa) y busca también en la marca y la categoría. Solo si nada coincide así, recurre a la similitud por trigramas y devuelve los 10 más parecidos.
- **Medido contra el catálogo real:** «absenta» → ABSINTHE ST. GEORGE; «jhonie walker» y «walker johnnie» → JOHNNIE WALKER; «blak label» → BLACK LABEL; «anejo» → los AÑEJO. El umbral es 0,25: con 0,3 «jhonie» no encontraba nada.
- **Límite:** la tolerancia es ortográfica, no semántica. Funciona entre «absenta» y «absinthe» porque se escriben parecido; un sinónimo que se escriba distinto no se encuentra. Marcas, categorías y bodegas siguen con la búsqueda anterior, pero sus desplegables filtran sin acentos (H-16).

## H-08
**Categorías, marcas y bodegas están escondidas en Administración**

- **Pregunta del instrumento:** ¿Es fácil localizar información que ya ha sido buscada con anterioridad?
- **Observado:** "Algunas acciones como crear bodegas, marcas y categorías no están en un lugar intuitivo de buscar (están en administración)."
- **Corrección:** pasan a la sección **Catálogo**, en pestañas junto a Productos. Las direcciones antiguas redirigen. Administración se queda con usuarios, organización y auditoría.

## H-09
**Las cards de licores no se escanean**

- **Pregunta del instrumento:** ¿La información está organizada según la lógica de los usuarios a quienes va dirigida?
- **Observado:** "La información de los licores en las cards, a pesar de que es completa, a veces requiere leer con detenimiento para entender cosas que deben entenderse sin detallarlas, como la cantidad de existencias o qué significa cada etiqueta."
- **Corrección:** la existencia disponible va junto al nombre, en grande y con color de estado (suficiente, bajo mínimo, sin stock). Cada etiqueta lleva su rótulo visible.

## H-10
**Errores en inglés o crudos del backend**

- **Pregunta del instrumento:** ¿El mensaje de error que aparece es fácilmente interpretable?
- **Observado:** "Hay errores que solo muestran su descripción en inglés o que muestran mensajes directamente de la base de datos."
- **Corrección:** la API devuelve un `code` estable en cada error y el front lo traduce. Un error sin traducción cae a un mensaje genérico traducido según su tipo; el texto crudo del backend no se muestra nunca. Hasta que se despliegue la API nueva, el front ya traduce por el código de estado HTTP.

## H-11
**Validaciones solo en el backend; la fecha manual del movimiento sobra**

- **Observado:** hay reglas que solo valida la API, como "A movement cannot be dated in the future". Eso dejó ver que la fecha de un movimiento no debería elegirse a mano: siempre debe ser la fecha y hora actuales.
- **Corrección:**
  - Se elimina el selector de fecha: la API sella cada movimiento con su fecha y hora.
  - Del resto de reglas de la API, el front ya validaba antes de enviar el motivo del ajuste, las dos bodegas del traspaso y el tope de existencias. Una línea en cero tampoco llega a enviarse, porque se quita del borrador. La única regla que faltaba era la fecha futura, y desaparece con el selector.

## H-12
**No hay documentación de uso**

- **Observado:** no hay documentación de cómo se usa ni cómo se configura el software, del flujo de trabajo ni de los roles.
- **Corrección:** página pública **Ayuda** (`/help`) con primeros pasos, roles y permisos, tipos de movimiento, borradores, existencias y kardex, reportes, configuración, preferencias, atajos y glosario.

## H-13
**No se entiende por qué el contador no deja aumentar la cantidad**

- **Dónde:** cards de licores al registrar un movimiento.
- **Observado:** "Debido a que el contador de existencias es pequeño, no se entiende a veces por qué no deja aumentar o disminuir la cantidad de cajas o botellas de un movimiento."
- **Corrección:** al llegar al máximo aparece bajo el contador un mensaje visible con el tope y la bodega, en lugar del tooltip que solo se veía al pasar el ratón.

## H-14
**No hay opción de ayuda**

- **Pregunta del instrumento:** ¿Existe la opción "ayuda"?
- **Observado:**
  - "Se encuentran las secciones de qué resuelve, cómo funciona y las preguntas de la página, pero no la opción de ayuda en caso de que suceda algo" (footer).
  - "La página no tiene botón de ayuda. No es tan relevante, la página es fácil de usar, pero no está de más."
- **Corrección:** enlace a Ayuda en el footer y en la navegación de la landing, y un botón "?" en la barra superior de la aplicación.

## H-15
**Atajos de teclado escasos y no documentados**

- **Observado:** no hay atajos aparte de los básicos, y no se explica que existen los que hay (Enter para enviar, una tecla para saltar por inicial en un desplegable).
- **Corrección:** `/` enfoca la búsqueda, `?` abre la lista de atajos, Ctrl+Z/Ctrl+Y deshacen y rehacen en la captura y Ctrl+Enter registra el movimiento. La lista de atajos documenta también los nativos.

## H-16
**Los desplegables largos no tienen búsqueda**

- **Observado:** los desplegables no permiten buscar cuando son muy largos.
- **Corrección:** las listas de categorías, marcas y bodegas pasan a un desplegable con filtro que ignora acentos y se maneja con flechas.

## H-17
**Los errores de formulario solo aparecen al salir del campo**

- **Pregunta del instrumento:** ¿Los errores cometidos se muestran en tiempo real?
- **Observado:** "Solo se muestra que algo se diligenció mal si se diligencia y se quita el foco del campo, no mientras se llena."
- **Corrección:** un campo que el usuario ya empezó a escribir se valida en cada cambio. Un campo sin tocar sigue esperando a perder el foco, para no marcar error antes de escribir.

## H-18
**No hay indicador de que el borrador se está guardando**

- **Observado:** el usuario no sabe que el borrador se guarda: no hay estado de "guardando" o "guardado" que le dé seguridad de que su trabajo no se perderá.
- **Corrección:** la barra del borrador indica "Borrador guardado en este dispositivo" con la hora del último guardado.

## H-19
**"Ledger" es jerga para usuarios nuevos**

- **Pregunta del instrumento:** ¿Se utilizan frases y conceptos familiares para el usuario?
- **Observado:** "En la aplicación siempre se refiere al ledger como el registro de los movimientos, pero ese concepto no es muy claro para usuarios nuevos."
- **Corrección:** los textos dicen "registro de movimientos", y el término queda explicado en el glosario de Ayuda.

## H-20
**Tema claro, alto contraste y tamaño de texto**

Alias de [H-03](#h-03). Se conserva el id para no perder la trazabilidad con el instrumento.
