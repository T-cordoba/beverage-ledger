@rf-28
Feature: RF-28 Consultar el reporte de consumo
  Como gerente
  Quiero ver qué se consume más en un periodo
  Para decidir qué comprar

  Scenario: Ranking anual por categoría
    Given el usuario ingresó a la aplicación
    When abre la sección "Reportes"
    And elige la opción "Año"
    And elige la opción "Por categoría"
    Then la opción "Por categoría" queda marcada
    And el ranking empieza en la posición 1
