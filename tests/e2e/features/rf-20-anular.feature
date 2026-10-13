@web @rf-20
Feature: RF-20 Anular un movimiento confirmado
  Como encargada de bodega
  Quiero anular un movimiento que se registró por error
  Para que las existencias vuelvan sin reescribir el ledger

  Background:
    Given Camila ingresó a la aplicación
    And ella registró una entrada de 1 botella

  @escribe-en-el-ledger
  Scenario: Anular revierte el movimiento y lo conserva marcado como anulado
    When ella consulta en la API las existencias del producto del movimiento
    And ella anula el movimiento con el motivo "Registrado por error en la prueba E2E"
    Then ella ve el movimiento de tipo "Entrada" en estado "anulado"
    And las existencias de ese producto en la API cambiaron en -1
    And el dato "Anulado el" del movimiento aparece
    And el movimiento ya no ofrece anularlo
    And el código del movimiento no cambió

  @escribe-en-el-ledger
  Scenario: Una anulación sin motivo no se envía
    When ella intenta anular el movimiento sin escribir un motivo
    Then el motivo de la anulación dice "Este campo no puede quedar vacío."
    When ella decide conservar el movimiento
    Then ella ve el movimiento de tipo "Entrada" en estado "confirmado"
    When ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Then ella ve el movimiento de tipo "Entrada" en estado "anulado"
