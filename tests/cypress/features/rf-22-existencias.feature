@rf-22
Feature: RF-22 Consultar las existencias actuales
  Como encargado de bodega
  Quiero ver cuánto hay de cada producto
  Para saber qué puedo despachar sin contar a mano

  Background:
    Given el usuario ingresó a la aplicación

  Scenario: Ver la tabla de existencias
    When abre la sección "Existencias"
    Then ve el título "Existencias"
    And la tabla de existencias lista al menos un producto
    And el conteo de resultados tiene la forma "X–Y de N resultados"
