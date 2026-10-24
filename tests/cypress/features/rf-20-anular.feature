# language: es
@web @rf-20
Característica: RF-20 Anular un movimiento confirmado
  Como encargada de bodega
  Quiero anular un movimiento que se registró por error
  Para que las existencias vuelvan sin reescribir el ledger

  Antecedentes:
    Dado Camila ingresó a la aplicación
    Y ella registró una entrada de 1 botella

  @escribe-en-el-ledger
  Escenario: Anular revierte el movimiento y lo conserva marcado como anulado
    Cuando ella consulta en la API las existencias del producto del movimiento
    Y ella anula el movimiento con el motivo "Registrado por error en la prueba E2E"
    Entonces ella ve el movimiento de tipo "Entrada" en estado "anulado"
    Y las existencias de ese producto en la API cambiaron en -1
    Y el dato "Anulado el" del movimiento aparece
    Y el movimiento ya no ofrece anularlo
    Y el código del movimiento no cambió

  @escribe-en-el-ledger
  Escenario: Una anulación sin motivo no se envía
    Cuando ella intenta anular el movimiento sin escribir un motivo
    Entonces el motivo de la anulación dice "Este campo no puede quedar vacío."
    Cuando ella decide conservar el movimiento
    Entonces ella ve el movimiento de tipo "Entrada" en estado "confirmado"
    Cuando ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Entonces ella ve el movimiento de tipo "Entrada" en estado "anulado"
