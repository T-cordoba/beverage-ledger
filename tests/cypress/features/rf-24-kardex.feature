@rf-24
Feature: RF-24 Consultar el kardex de un producto
  Como encargado de bodega
  Quiero ver el histórico de movimientos de un producto
  Para explicar de dónde sale su existencia actual

  Background:
    Given el usuario ingresó a la aplicación
    And abre la sección "Existencias"

  Scenario: El saldo del kardex coincide con la existencia
    When abre el kardex del primer producto listado
    Then el kardex es del producto elegido
    And el saldo más reciente coincide con lo que hay en existencia
