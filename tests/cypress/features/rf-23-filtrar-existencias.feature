@rf-23
Feature: RF-23 Filtrar las existencias
  Como encargado de bodega
  Quiero buscar un producto por su nombre
  Para encontrarlo sin recorrer todas las páginas

  Background:
    Given el usuario ingresó a la aplicación
    And abre la sección "Existencias"

  Scenario: Buscar por parte del nombre
    When busca "AMARO" en las existencias
    Then todos los productos listados contienen "AMARO"

  Scenario: Búsqueda sin coincidencias
    When busca "zzz-producto-que-no-existe" en las existencias
    Then ve el aviso "Ningún producto coincide con esos filtros."
