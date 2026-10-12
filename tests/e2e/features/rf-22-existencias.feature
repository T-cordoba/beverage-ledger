@web @rf-22
Feature: RF-22 Consultar las existencias actuales
  Como encargada de bodega
  Quiero ver cuánto hay de cada producto
  Para saber qué puedo despachar sin contar a mano

  Background:
    Given Camila ingresó a la aplicación

  Scenario: Ver la tabla de existencias
    When ella abre la sección "Existencias"
    Then ella ve el título "Existencias"
    And la tabla de existencias tiene las columnas:
      | Producto      |
      | Categoría     |
      | En existencia |
      | Mínimo        |
      | Estado        |
    And la tabla lista al menos un producto
    And el conteo de resultados tiene la forma "1–10 de N resultados"
