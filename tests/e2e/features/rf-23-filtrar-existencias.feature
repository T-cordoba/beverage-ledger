@web @rf-23
Feature: RF-23 Filtrar las existencias
  Como encargada de bodega
  Quiero buscar un producto por su nombre
  Para encontrarlo sin recorrer las 22 páginas

  Background:
    Given Camila ingresó a la aplicación
    And ella abre la sección "Existencias"

  Scenario: Buscar por parte del nombre
    When ella busca "AMARO" en las existencias
    Then todos los productos listados contienen "AMARO"

  Scenario: Una búsqueda sin coincidencias lo dice en vez de mostrar una tabla vacía
    When ella busca "zzz-producto-que-no-existe" en las existencias
    Then ella ve el aviso de que ningún producto coincide
