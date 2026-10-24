# language: es
@web @rf-15
Característica: RF-15 Registrar una salida de inventario
  Como encargada de bodega
  Quiero registrar lo que sale de la bodega hacia la barra
  Para que las existencias bajen en cuanto se despacha

  Antecedentes:
    Dado Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Escenario: Una salida confirmada queda registrada y se puede revertir
    Cuando ella registra una salida de 1 botella
    Entonces ella ve el movimiento de tipo "Salida" en estado "confirmado"
    Y las líneas del movimiento son "1 botella"
    Cuando ella consulta en la API las existencias del producto del movimiento
    Y ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Entonces ella ve el movimiento de tipo "Salida" en estado "anulado"
    Y las existencias de ese producto en la API cambiaron en 1

  Escenario: El selector no deja sacar más de lo que hay en la bodega
    Cuando ella abre la captura de salida en la bodega por defecto
    Y ella añade 1 botella del primer producto disponible
    Entonces a ese producto le queda una unidad menos de las que tiene en existencia
    Cuando ella descarta el borrador
    Entonces ya no queda ningún borrador pendiente
