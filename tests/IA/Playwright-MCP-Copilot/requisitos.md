# Requisitos y escenarios — Beverage Ledger (RF-15 a RF-21)

Entrada para GitHub Copilot. Son los mismos 19 escenarios que cubren
`../Playwright-Test-Agents/` y `../Cypress-Studio-AI/`, con los mismos títulos, para
poder comparar las tres herramientas. Los conceptos comunes vienen del archivo de
requisitos que se preparó para Testsigma (herramienta descartada).

- Aplicación: Beverage Ledger (Next.js), inventario de bebidas por bodega, interfaz en español.
- Front `http://localhost:3000`, API `http://localhost:3001` (entorno local desechable).
- Usuario: Manager de pruebas. Sus credenciales están en `.env` (no versionado); en el
  navegador de Playwright MCP se escriben con los nombres `TEST_USER_EMAIL` y
  `TEST_USER_PASSWORD`, que el servidor MCP sustituye por el valor real.

## Conceptos comunes

- Login en `/login`: campos "Correo electrónico" y "Contraseña", botón "Entrar"; lleva a `/dashboard`.
- Los movimientos se capturan en tarjetas de producto (`listitem`): nombre (h3),
  "N en existencia", botones "Añadir botella", "Quitar botella", "Añadir caja",
  "Quitar caja" (1 caja = 12 botellas) y debajo "N unidad(es) en total".
- Con al menos una unidad capturada aparece una barra con "Ver el resumen",
  "Descartar" y "Confirmar". Sin unidades la barra no existe.
- "Confirmar" abre un diálogo "¿Confirmar esta <tipo>?" con "Confirmar" y "Volver".
  Al confirmar se navega a `/movements/{uuid}` y se muestra "Movimiento registrado" y
  "MOV-AAAA-NNNNNN se confirmó y se aplicó a las existencias.".
- Historial `/movements`: cada movimiento es un `article` con su código MOV-…, tipo
  (Salida, Entrada, Traspaso, Ajuste), estado (confirmado / anulado), enlace "Detalle"
  y botón "PDF". Buscador "Buscar movimientos por código".
- Existencias `/stock`: buscador "Buscar existencias por producto" y filtro
  "Filtrar por bodega". Bodegas: "Bodega principal (por defecto)" y "Barra E2E".
- Los saldos cambian entre ejecuciones: toda verificación de saldo se hace contra el
  valor leído al inicio de la prueba, nunca contra un número fijo.
- Todo movimiento que confirma una prueba se anula al terminar (fixture `ledger`).

## RF-15 Salida (OUTBOUND) — `/movements/new/outbound` — 5 pruebas

1. **Registrar una salida correcta**: añadir 1 botella al primer producto, escribir una
   Nota, Confirmar y confirmar en "¿Confirmar esta salida?". Se ve "Movimiento
   registrado"; en `/stock` la existencia del producto baja exactamente 1; en
   `/movements` el código aparece como "Salida" y "confirmado".
2. **Sin productos no aparece la barra Confirmar**: sin unidades no hay "Confirmar",
   "Descartar" ni "Ver el resumen"; al añadir 1 botella aparece "Confirmar"; al
   quitarla desaparece de nuevo.
3. **Cantidades incorrectas: quitar por debajo de cero y tope del stepper**: con 0
   unidades "Quitar botella"/"Quitar caja" no bajan de "0 unidades en total"; al añadir
   botellas hasta la existencia N del producto con menos existencia, "Añadir botella" y
   "Añadir caja" quedan deshabilitados con título "Solo quedan 0 en esta bodega" y se
   lee "N en existencia · quedan 0".
4. **Inventario insuficiente por tope compartido botellas/cajas**: botellas y cajas
   gastan la misma existencia: con menos de 12 unidades restantes "Añadir caja" queda
   deshabilitado ("Solo quedan R en esta bodega"); al cambiar "Bodega" a "Barra E2E"
   la existencia mostrada cambia.
5. **Volver del diálogo y Descartar no escriben en el ledger**: Confirmar → "Volver"
   cierra el diálogo y el último código del historial no cambia; "Descartar" →
   "Conservarlo" mantiene la captura; "Descartar" → "Descartar" muestra "Borrador
   descartado" y "No se envió nada al ledger.".

## RF-16 Entrada (INBOUND) — `/movements/new/inbound` — 2 pruebas

1. **Registrar una entrada y verla en detalle e historial**: añadir 1 caja (12
   unidades) al primer producto, confirmar en "¿Confirmar esta entrada?"; la existencia
   sube 12; en `/movements` (buscando el código) es "Entrada" "confirmado"; su
   "Detalle" muestra el código, "Líneas (1)" y "confirmado".
2. **Validación de la entrada: sin líneas y diálogo con Volver**: "Registrar una
   entrada" no muestra "Confirmar" sin líneas; con 1 botella aparecen "Ahora" y
   "Déjalo vacío para registrarlo como ahora."; Confirmar → "Volver" no registra nada
   (el último código del historial no cambia).

## RF-17 Traspaso (TRANSFER) — `/movements/new/transfer` — 4 pruebas

Combobox "Desde" ("Elige un origen") y "Hacia" ("Elige un destino") (Radix: esperar a
que el listbox se cierre antes de abrir el siguiente).

1. **Origen y destino obligatorios**: con 1 botella y sin bodegas, "Confirmar" está
   deshabilitado (aria-disabled); con solo "Desde" sigue deshabilitado; con ambos se habilita.
2. **El destino excluye al origen**: "Hacia" no ofrece la bodega elegida en "Desde" y
   viceversa.
3. **Registrar un traspaso y verificar las dos puntas**: Desde "Bodega principal (por
   defecto)" Hacia "Barra E2E", 1 botella, confirmar "¿Confirmar este traspaso?"; el
   detalle muestra "Traspaso", "confirmado", "Líneas (2)", "-1 unidad base" y "1 unidad
   base"; en `/stock` el origen baja 1 y el destino sube 1 respecto a lo leído antes.
4. **Cantidades del traspaso topadas por el origen**: botellas y cajas hasta la
   existencia del origen dejan ambos "Añadir" deshabilitados ("Solo quedan 0 en esta
   bodega"); quitar por debajo de cero deja "0 unidades en total" y sin "Confirmar".

## RF-18 Ajuste (ADJUSTMENT) — `/movements/new/adjustment` — 2 pruebas

1. **Motivo obligatorio de al menos 4 caracteres**: con -1 botella y "Motivo" vacío
   "Confirmar" está deshabilitado; "ab" muestra "Escribe al menos 4 caracteres."; solo
   espacios muestra "Este campo no puede quedar vacío."; un motivo válido habilita
   "Confirmar"; volver a 0 unidades quita la barra.
2. **Registrar un ajuste con motivo válido**: -1 botella, Motivo "Rotura de botella",
   confirmar "¿Confirmar este ajuste?"; el detalle muestra "Ajuste", el motivo,
   "Líneas (1)" y "-1 unidad base"; la existencia baja 1.

## RF-20 Anulación — `/movements/{id}` — 3 pruebas

Solo se anulan movimientos creados por la propia prueba (una entrada de 1 botella).
"Anular" abre "¿Anular MOV-…?" con "Motivo" y botones "Anular" y "Conservarlo".

1. **Conservarlo cancela la anulación**: "Conservarlo" cierra el diálogo y el estado
   sigue "confirmado" con el botón "Anular" visible.
2. **Motivo obligatorio al anular**: vacío y solo espacios → "Este campo no puede
   quedar vacío."; "ab" → "Escribe al menos 4 caracteres."; el movimiento no se anula.
3. **Anular con motivo válido**: Motivo "Error de captura" → "Movimiento anulado" y
   "MOV-… se revirtió y las existencias volvieron."; el detalle muestra "anulado",
   "Anulado el", ya no muestra "Anular", y la existencia vuelve al valor previo a la entrada.

## RF-21 Comprobante PDF — `/movements` y `/movements/{id}` — 3 pruebas

1. **Descargar el PDF desde el historial**: el botón "PDF" del primer movimiento
   (descripción "Descargar MOV-… en PDF") descarga `MOV-AAAA-NNNNNN.pdf`, que empieza
   por `%PDF` y contiene el código, "Tipo:" y "Estado:"; no aparece "No se pudo descargar el PDF".
2. **Descargar el PDF desde el detalle**: igual, desde el botón "PDF" del detalle.
3. **Descargar el PDF de un movimiento anulado**: entrada propia de 1 botella,
   anulada con motivo válido; su PDF dice `CANCELLED`.

**Total: 19 pruebas** (5 + 2 + 4 + 2 + 3 + 3).
