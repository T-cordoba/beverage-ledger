@web @rf-28
Feature: RF-28 Reporte de consumo
  Como encargada de bodega
  Quiero ver lo más despachado en un periodo
  Para planear las compras

  Background:
    Given Camila ingresó a la aplicación
    And ella abre la sección "Reportes"

  Scenario Outline: El ranking va de lo más a lo menos despachado
    When ella elige "<periodo>" en el reporte
    And ella elige "<agrupación>" en el reporte
    Then el ranking está numerado desde 1 sin saltos
    And las unidades del ranking van de mayor a menor

    Examples:
      | periodo | agrupación    |
      | Mes     | Por producto  |
      | Año     | Por categoría |
      | Año     | Por marca     |
