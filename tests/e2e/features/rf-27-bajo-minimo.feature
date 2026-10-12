@web @api @rf-27
Feature: RF-27 Productos bajo el stock mínimo
  Como encargada de bodega
  Quiero ver en el panel qué productos están por debajo de su mínimo
  Para saber qué pedir primero

  Scenario: La tarjeta del panel muestra lo mismo que reporta la API
    Given Camila ingresó a la aplicación
    When ella abre la sección "Panel"
    And ella consulta directamente en la API los 8 productos más bajo mínimo
    Then la API responde con estado 200
    And la tarjeta "Bajo mínimo" muestra los mismos productos que la API, en el mismo orden
