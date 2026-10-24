@web @rf-15
Feature: RF-15 Registrar una salida de inventario
  Como encargada de bodega
  Quiero registrar lo que sale de la bodega hacia la barra
  Para que las existencias bajen en cuanto se despacha

  Background:
    Given Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Scenario: Una salida confirmada queda registrada y se puede revertir
    When ella registra una salida de 1 botella
    Then ella ve el movimiento de tipo "Salida" en estado "confirmado"
    And las líneas del movimiento son "1 botella"
    When ella consulta en la API las existencias del producto del movimiento
    And ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Then ella ve el movimiento de tipo "Salida" en estado "anulado"
    And las existencias de ese producto en la API cambiaron en 1

  Scenario: El selector no deja sacar más de lo que hay en la bodega
    When ella abre la captura de salida en la bodega por defecto
    And ella añade 1 botella del primer producto disponible
    Then a ese producto le queda una unidad menos de las que tiene en existencia
    When ella descarta el borrador
    Then ya no queda ningún borrador pendiente
