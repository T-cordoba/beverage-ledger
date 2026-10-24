# language: es
@web @rf-18
Característica: RF-18 Registrar un ajuste de inventario
  Como encargada de bodega
  Quiero corregir las existencias por rotura o por un conteo que no cuadró
  Para que el número registrado vuelva a ser el real, con su motivo

  Antecedentes:
    Dado Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Escenario: Un ajuste con motivo queda registrado y se puede revertir
    Cuando ella registra un ajuste de 1 botella con el motivo "Diferencia de conteo E2E"
    Entonces ella ve el movimiento de tipo "Ajuste" en estado "confirmado"
    Y el dato "Motivo" del movimiento es "Diferencia de conteo E2E"
    Cuando ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Entonces ella ve el movimiento de tipo "Ajuste" en estado "anulado"

  Esquema del escenario: Un ajuste sin un motivo suficiente no se puede confirmar
    Cuando ella abre la captura de ajuste
    Y ella escribe el motivo "<motivo>"
    Y ella añade 1 botella del primer producto disponible
    Y ella intenta confirmar el movimiento
    Entonces el aviso de lo que falta dice "<aviso>"
    Y ella sigue en la ruta "/movements/new/adjustment"
    Cuando ella descarta el borrador
    Entonces ya no queda ningún borrador pendiente

    Ejemplos:
      | motivo | aviso                                                    |
      |        | Un ajuste necesita un motivo antes de poder confirmarse. |
      | abc    | Al menos 4 caracteres.                                   |
