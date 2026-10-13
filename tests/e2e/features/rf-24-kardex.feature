@web @rf-24
Feature: RF-24 Consultar el kardex de un producto
  Como encargada de bodega
  Quiero ver el historial de movimientos de un producto con su saldo
  Para explicar de dónde sale la existencia actual

  Scenario: El saldo más reciente del kardex es la existencia actual
    Given Camila ingresó a la aplicación
    And ella abre la sección "Existencias"
    When ella abre el kardex del primer producto de la lista
    Then el kardex es del producto que eligió
    And el saldo de la línea más reciente coincide con las unidades en existencia
