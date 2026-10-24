@rf-27
Feature: RF-27 Ver los productos bajo mínimo
  Como encargado de bodega
  Quiero ver en el panel qué productos están por debajo de su mínimo
  Para reponerlos antes de quedarme sin stock

  Scenario: El panel muestra la tarjeta de bajo mínimo
    Given el usuario ingresó a la aplicación
    Then ve la tarjeta "Bajo mínimo"
    And la tarjeta lista productos o dice "Nada está por debajo de su mínimo."
