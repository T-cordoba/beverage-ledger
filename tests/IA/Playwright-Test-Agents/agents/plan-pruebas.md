# Plan E2E Beverage Ledger: movimientos, comprobante y autenticación

## Application Overview

Plan E2E del frontend de Beverage Ledger (Next.js, interfaz en español) en http://localhost:3000 contra una API local desechable. Seed común: generator/seed.pw.ts (sesión MANAGER iniciada en /dashboard). Datos observados: catálogo de 215 productos paginado de 10 en 10 (p. ej. "1942" con 55 en existencia, caja = 12 unidades), bodega "Bodega por defecto" y "Barra E2E". Cada fila del historial tiene enlace con el código (MOV-2026-000NNN), enlace "Detalle" y botón con nombre accesible "Descargar <código> en PDF". Barra de captura: "Ver el resumen", "Descartar", "Confirmar"; el diálogo (role=dialog) muestra "¿Confirmar esta salida?", "Esto escribe 1 producto en el ledger y mueve 1 unidad — las cajas cuentan según su tamaño.", "Volver" y "Confirmar". Motivo mínimo: 4 caracteres (MIN_REASON_LENGTH). Textos fuente en src/i18n/messages/es.json. Notas: el borrador se guarda en localStorage por tipo de movimiento, así que cada prueba debe limpiar localStorage (o pulsar "Descartar") para ser independiente. Los escenarios que escriben en el ledger usan datos propios (producto/cantidad pequeña) y no dependen del orden. Throttling de login: 10/min; la cuenta manager@test.com se bloquea a los 5 fallos, por eso los logins incorrectos usan un correo inexistente.

## Test Scenarios

### 1. RF-15 Salida

**Seed:** `generator/seed.pw.ts`

#### 1.1. Registrar una salida correcta

**File:** `generator/rf-15-salida.pw.ts`

**Steps:**
  1. [ESCRIBE EN EL LEDGER] Ir a /movements/new/outbound. Anotar la existencia del producto '1942' (p. ej. '55 en existencia'). Pulsar 'Añadir botella' en su tarjeta (1 vez) y escribir una nota opcional.
    - expect: El contador de botellas muestra 1 y '1 unidad en total'
    - expect: Aparece la barra con 'Ver el resumen', 'Descartar' y 'Confirmar'
  2. Pulsar 'Confirmar' en la barra.
    - expect: Se abre un diálogo con '¿Confirmar esta salida?' y 'Esto escribe 1 producto en el ledger y mueve 1 unidad — las cajas cuentan según su tamaño.'
  3. Pulsar 'Confirmar' dentro del diálogo.
    - expect: Toast 'Movimiento registrado' con '<código> se confirmó y se aplicó a las existencias.'
    - expect: La existencia del producto en /stock baja en 1 unidad
    - expect: El movimiento aparece en /movements como 'Salida' 'confirmado'

#### 1.2. Sin productos no aparece la barra Confirmar

**File:** `generator/rf-15-salida-validacion.pw.ts`

**Steps:**
  1. Ir a /movements/new/outbound sin añadir nada (localStorage limpio).
    - expect: No existen los botones 'Confirmar', 'Descartar' ni 'Ver el resumen'
    - expect: Los contadores de todos los productos están en 0
  2. Añadir 1 botella y luego pulsar 'Quitar botella'.
    - expect: La barra desaparece al volver a 0 unidades

#### 1.3. Cantidades incorrectas: quitar por debajo de cero y tope del stepper

**File:** `generator/rf-15-salida-cantidades.pw.ts`

**Steps:**
  1. Con el contador en 0 pulsar 'Quitar botella' y 'Quitar caja'.
    - expect: El contador sigue en 0, nunca negativo (o el botón está deshabilitado)
  2. Elegir un producto con poca existencia (usar el filtro de búsqueda) y pulsar 'Añadir botella' repetidamente hasta alcanzar la existencia N.
    - expect: El contador se detiene en N
    - expect: Se muestra 'Solo quedan N en esta bodega' y 'Añadir botella' queda deshabilitado/no aumenta
    - expect: Una caja (12 unidades) que superaría el tope no se puede añadir

#### 1.4. Inventario insuficiente por tope compartido botellas/cajas

**File:** `generator/rf-15-salida-insuficiente.pw.ts`

**Steps:**
  1. Para un producto con existencia < 12 añadir botellas hasta el tope y probar 'Añadir caja'.
    - expect: El tope se calcula sobre unidades base: la caja no se añade
    - expect: Se muestra 'Solo quedan N en esta bodega'
  2. Cambiar la bodega a 'Barra E2E' (selector 'Bodega') y observar la existencia mostrada.
    - expect: La existencia ('N en existencia') corresponde a la bodega elegida y el tope se recalcula

#### 1.5. Volver del diálogo y Descartar no escriben en el ledger

**File:** `generator/rf-15-salida-cancelar.pw.ts`

**Steps:**
  1. Añadir 1 botella, pulsar 'Confirmar' y en el diálogo pulsar 'Volver'.
    - expect: El diálogo se cierra, el borrador sigue con 1 unidad, no hay toast 'Movimiento registrado'
    - expect: El historial no ha cambiado
  2. Pulsar 'Descartar' y en el diálogo '¿Descartar lo que capturaste?' elegir 'Conservarlo', luego repetir y confirmar el descarte.
    - expect: 'Conservarlo' mantiene las líneas; descartar limpia todo y muestra 'Borrador descartado' / 'No se envió nada al ledger.'

### 2. RF-16 Entrada

**Seed:** `generator/seed.pw.ts`

#### 2.1. Registrar una entrada y verla en detalle e historial

**File:** `generator/rf-16-entrada.pw.ts`

**Steps:**
  1. [ESCRIBE EN EL LEDGER] Ir a /movements/new/inbound, añadir 1 caja de un producto, pulsar 'Confirmar' y confirmar en el diálogo '¿Confirmar esta entrada?'.
    - expect: Toast 'Movimiento registrado' y '<código> se confirmó y se aplicó a las existencias.'
    - expect: La existencia aumenta en 12 unidades
  2. Abrir /movements, buscar el código y entrar en 'Detalle'.
    - expect: El historial muestra 'Entrada' 'confirmado'
    - expect: El detalle muestra Líneas (1), 'Registrado por' Manager Katalon (local) y estado confirmado

#### 2.2. Validación de la entrada: sin líneas y diálogo con Volver

**File:** `generator/rf-16-entrada-validacion.pw.ts`

**Steps:**
  1. Abrir /movements/new/inbound sin productos.
    - expect: No aparece la barra 'Confirmar'
  2. Añadir un producto, 'Confirmar' y 'Volver'.
    - expect: El diálogo '¿Confirmar esta entrada?' se cierra sin crear movimiento
  3. Probar el selector 'Ocurrió el' (por defecto 'Ahora') y la nota.
    - expect: Vacío significa ahora; la nota es opcional y no bloquea

### 3. RF-17 Traspaso

**Seed:** `generator/seed.pw.ts`

#### 3.1. Origen y destino obligatorios

**File:** `generator/rf-17-traspaso-validacion.pw.ts`

**Steps:**
  1. Ir a /movements/new/transfer: los selectores 'Desde' ('Elige un origen') y 'Hacia' ('Elige un destino') están vacíos. Añadir 1 botella de un producto.
    - expect: Aparece 'Un traspaso necesita un origen.' / 'Un traspaso necesita un destino.' o la confirmación queda bloqueada
  2. Elegir solo 'Desde' y comprobar la confirmación.
    - expect: Sigue sin poderse confirmar hasta elegir 'Hacia'

#### 3.2. El destino excluye al origen

**File:** `generator/rf-17-traspaso-excluye-origen.pw.ts`

**Steps:**
  1. Elegir 'Desde' = 'Bodega por defecto' y abrir 'Hacia'.
    - expect: 'Bodega por defecto' no aparece como opción; sí 'Barra E2E'
  2. Elegir 'Hacia' = 'Barra E2E' y luego cambiar 'Desde' a 'Barra E2E'.
    - expect: El destino se limpia o la combinación queda inválida; nunca origen = destino

#### 3.3. Registrar un traspaso y verificar las dos puntas

**File:** `generator/rf-17-traspaso.pw.ts`

**Steps:**
  1. [ESCRIBE EN EL LEDGER] Desde 'Bodega por defecto' Hacia 'Barra E2E', añadir 1 botella (respetando el tope de la bodega de origen), 'Confirmar' y confirmar en '¿Confirmar este traspaso?'.
    - expect: Toast 'Movimiento registrado'
  2. Abrir el detalle del movimiento.
    - expect: Tipo 'Traspaso' con 2 líneas por producto, una negativa en el origen y una positiva en el destino
    - expect: El total no cambia: /stock filtrado por cada bodega refleja -1 y +1

#### 3.4. Cantidades del traspaso topadas por el origen

**File:** `generator/rf-17-traspaso-cantidades.pw.ts`

**Steps:**
  1. Elegir origen y añadir botellas hasta el tope; intentar quitar por debajo de cero.
    - expect: Aparece 'Solo quedan N en esta bodega' y el contador no pasa de N ni baja de 0

### 4. RF-18 Ajuste

**Seed:** `generator/seed.pw.ts`

#### 4.1. Motivo obligatorio de al menos 4 caracteres

**File:** `generator/rf-18-ajuste-validacion.pw.ts`

**Steps:**
  1. Ir a /movements/new/adjustment, añadir una cantidad con signo a un producto y dejar 'Motivo' vacío.
    - expect: Se muestra 'Un ajuste necesita un motivo antes de poder confirmarse.' y no se puede confirmar
  2. Escribir 'ab' (menos de 4 caracteres) en 'Motivo' (placeholder 'Rotura, diferencia de conteo…').
    - expect: Mensaje 'Al menos 4 caracteres.' y confirmar sigue bloqueado
  3. Escribir un motivo de 4 espacios.
    - expect: Los espacios no cuentan (se recorta): sigue inválido

#### 4.2. Registrar un ajuste con motivo válido

**File:** `generator/rf-18-ajuste.pw.ts`

**Steps:**
  1. [ESCRIBE EN EL LEDGER] Cantidad -1 en un producto, motivo 'Rotura de botella', 'Confirmar' y confirmar en '¿Confirmar este ajuste?'.
    - expect: Toast 'Movimiento registrado'
    - expect: En el detalle se ve 'Motivo: Rotura de botella' y la cantidad con signo; la existencia baja en 1

### 5. RF-20 Anulación

**Seed:** `generator/seed.pw.ts`

#### 5.1. Conservarlo cancela la anulación

**File:** `generator/rf-20-anulacion-conservar.pw.ts`

**Steps:**
  1. Crear (o localizar) un movimiento confirmado propio y abrir /movements/{id}. Pulsar 'Anular'.
    - expect: Diálogo '¿Anular <código>?' con 'Lo que este movimiento tomó de las existencias vuelve…' y campo 'Motivo' (placeholder '¿Por qué se anula?')
  2. Pulsar 'Conservarlo'.
    - expect: El diálogo se cierra y el estado sigue 'confirmado'; no hay toast de anulación

#### 5.2. Motivo obligatorio al anular

**File:** `generator/rf-20-anulacion-validacion.pw.ts`

**Steps:**
  1. Abrir el diálogo de anulación y confirmar con el motivo vacío o de menos de 4 caracteres.
    - expect: Se muestra error de motivo y el movimiento no se anula

#### 5.3. Anular con motivo válido

**File:** `generator/rf-20-anulacion.pw.ts`

**Steps:**
  1. [ESCRIBE EN EL LEDGER] Registrar una entrada propia, abrir su detalle, 'Anular', escribir 'Error de captura' y confirmar.
    - expect: Toast 'Movimiento anulado' / '<código> se revirtió y las existencias volvieron.'
    - expect: El estado pasa a 'anulado', aparece 'Anulado el' y el motivo; las existencias vuelven al valor previo
    - expect: Ya no se ofrece 'Anular'

### 6. RF-21 Comprobante PDF

**Seed:** `generator/seed.pw.ts`

#### 6.1. Descargar el PDF desde el historial

**File:** `generator/rf-21-pdf-historial.pw.ts`

**Steps:**
  1. Ir a /movements y pulsar el botón 'Descargar MOV-2026-000691 en PDF' (usar el primer botón de la lista), esperando el evento download.
    - expect: La descarga se llama '<código>.pdf' (p. ej. MOV-2026-000691.pdf) y no aparece 'No se pudo descargar el PDF'

#### 6.2. Descargar el PDF desde el detalle

**File:** `generator/rf-21-pdf-detalle.pw.ts`

**Steps:**
  1. Abrir el detalle de un movimiento y pulsar el botón 'PDF'.
    - expect: Se descarga '<código>.pdf' con el mismo código que el título del detalle

### 7. Autenticación

**Seed:** `generator/seed.pw.ts`

#### 7.1. Login correcto

**File:** `generator/auth-login.pw.ts`

**Steps:**
  1. Sin sesión (storageState vacío) ir a /login, rellenar correo y contraseña válidos de manager@test.com y enviar (1 login).
    - expect: Redirección a /dashboard con el menú de la cuenta de Manager Katalon (local)

#### 7.2. Login incorrecto con correo inexistente

**File:** `generator/auth-login-invalido.pw.ts`

**Steps:**
  1. En /login enviar un correo inexistente (p. ej. noexiste-e2e@example.com) con cualquier contraseña. NUNCA usar manager@test.com con contraseña errónea.
    - expect: Se muestra un mensaje de error de credenciales, se permanece en /login y no hay sesión

#### 7.3. Campos vacíos

**File:** `generator/auth-campos-vacios.pw.ts`

**Steps:**
  1. En /login enviar el formulario con ambos campos vacíos y luego solo con el correo.
    - expect: Se muestran errores de validación por campo obligatorio y no se hace ninguna petición de login

#### 7.4. Sesión expirada devuelve a /login

**File:** `generator/auth-sesion-expirada.pw.ts`

**Steps:**
  1. Con contexto sin cookie de refresh ir a /movements.
    - expect: Se redirige a /login
  2. Con sesión activa borrar la cookie de refresh, recargar /dashboard.
    - expect: Se vuelve a /login

#### 7.5. Navegación y permisos del rol MANAGER

**File:** `generator/auth-permisos-manager.pw.ts`

**Steps:**
  1. Desde /dashboard revisar la navegación 'Principal'.
    - expect: Enlaces visibles: Panel, Existencias, Movimientos, Catálogo, Reportes; no existe 'Administración'
    - expect: Las cuatro acciones de registro (salida, entrada, traspaso, ajuste) están disponibles
  2. Ir directamente a /admin/users.
    - expect: Se muestra 'No tienes acceso a esta sección.' y no se cargan usuarios
