@web @rf-19
Feature: RF-19 Guardar y retomar un borrador de movimiento
  Como encargada de bodega
  Quiero que lo que capturé no se pierda si recargo la página
  Para no volver a contar una salida a medio registrar

  Scenario: El borrador sobrevive a una recarga y se puede descartar
    Given Camila ingresó a la aplicación
    When ella captura una salida de 2 botellas sin confirmarla
    And ella recarga la página
    Then el resumen del borrador dice "2 unidades"
    When ella descarta el borrador
    Then ya no queda ningún borrador pendiente
