@web @rf-17
Feature: RF-17 Registrar un traspaso entre bodegas
  Como encargada de bodega
  Quiero mover existencias de una bodega a otra
  Para que cada bodega refleje lo que tiene sin cambiar el total

  Background:
    Given Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Scenario: Un traspaso confirmado escribe las dos puntas y se puede revertir
    When ella registra un traspaso de 1 botella
    Then ella ve el movimiento de tipo "Traspaso" en estado "confirmado"
    And el movimiento tiene 2 líneas
    When ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Then ella ve el movimiento de tipo "Traspaso" en estado "anulado"

  Scenario: Un traspaso sin origen ni destino no se puede confirmar
    When ella abre la captura de traspaso
    And ella añade 1 botella del primer producto disponible
    And ella intenta confirmar el movimiento
    Then el aviso de lo que falta dice "Un traspaso necesita un origen."
    And el aviso de lo que falta dice "Un traspaso necesita un destino."
    And ella sigue en la ruta "/movements/new/transfer"
    When ella descarta el borrador
    Then ya no queda ningún borrador pendiente
