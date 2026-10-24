@web @rf-18
Feature: RF-18 Registrar un ajuste de inventario
  Como encargada de bodega
  Quiero corregir las existencias por rotura o por un conteo que no cuadró
  Para que el número registrado vuelva a ser el real, con su motivo

  Background:
    Given Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Scenario: Un ajuste con motivo queda registrado y se puede revertir
    When ella registra un ajuste de 1 botella con el motivo "Diferencia de conteo E2E"
    Then ella ve el movimiento de tipo "Ajuste" en estado "confirmado"
    And el dato "Motivo" del movimiento es "Diferencia de conteo E2E"
    When ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Then ella ve el movimiento de tipo "Ajuste" en estado "anulado"

  Scenario Outline: Un ajuste sin un motivo suficiente no se puede confirmar
    When ella abre la captura de ajuste
    And ella escribe el motivo "<motivo>"
    And ella añade 1 botella del primer producto disponible
    And ella intenta confirmar el movimiento
    Then el aviso de lo que falta dice "<aviso>"
    And ella sigue en la ruta "/movements/new/adjustment"
    When ella descarta el borrador
    Then ya no queda ningún borrador pendiente

    Examples:
      | motivo | aviso                                                    |
      |        | Un ajuste necesita un motivo antes de poder confirmarse. |
      | abc    | Al menos 4 caracteres.                                   |
