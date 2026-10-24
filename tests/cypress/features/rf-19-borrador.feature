@rf-19
Feature: RF-19 Guardar y retomar un borrador de movimiento
  Como encargado de bodega
  Quiero que lo que capturé no se pierda si recargo la página
  Para no volver a contar una salida a medio registrar

  Scenario: El borrador sobrevive a una recarga y se puede descartar
    Given el usuario ingresó a la aplicación
    When abre "Registrar una salida"
    And añade 2 botellas sin confirmar
    And recarga la página
    Then el resumen del borrador dice "2 unidades"
    When descarta el borrador
    Then ya no queda ningún borrador pendiente
