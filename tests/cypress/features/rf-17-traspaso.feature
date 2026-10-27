# language: es
@web @rf-17
Característica: RF-17 Registrar un traspaso entre bodegas
  Como encargada de bodega
  Quiero mover existencias de una bodega a otra
  Para que cada bodega refleje lo que tiene sin cambiar el total

  Antecedentes:
    Dado Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Escenario: Un traspaso confirmado escribe las dos puntas y se puede revertir
    Cuando ella registra un traspaso de 1 botella
    Entonces ella ve el movimiento de tipo "Traspaso" en estado "confirmado"
    Y el movimiento tiene 2 líneas
    Cuando ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Entonces ella ve el movimiento de tipo "Traspaso" en estado "anulado"

  Escenario: Un traspaso sin origen ni destino no se puede confirmar
    Cuando ella abre la captura de traspaso
    Y ella añade 1 botella del primer producto disponible
    Y ella intenta confirmar el movimiento
    Entonces el aviso de lo que falta dice "Un traspaso necesita un origen."
    Y el aviso de lo que falta dice "Un traspaso necesita un destino."
    Y ella sigue en la ruta "/movements/new/transfer"
    Cuando ella descarta el borrador
    Entonces ya no queda ningún borrador pendiente
