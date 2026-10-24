@web @rf-21
Feature: RF-21 Descargar el comprobante de un movimiento
  Como encargada de bodega
  Quiero descargar el comprobante en PDF de un movimiento
  Para archivarlo o entregarlo a quien recibió la mercancía

  Background:
    Given Camila ingresó a la aplicación

  Scenario: Descargar el comprobante desde el detalle del movimiento
    When ella abre el movimiento más reciente del historial
    And ella descarga el comprobante del movimiento
    Then el archivo descargado se llama como el código del movimiento
    And el archivo descargado es un PDF

  Scenario: Descargar el comprobante desde el historial
    When ella anota el movimiento más reciente del historial
    And ella descarga el comprobante del primer movimiento del historial
    Then el archivo descargado se llama como el código del movimiento
    And el archivo descargado es un PDF

  @api
  Scenario: La API entrega el comprobante como un PDF adjunto
    When ella anota el movimiento más reciente del historial
    And ella pide directamente a la API el comprobante de ese movimiento
    Then la API responde con estado 200
    And la API responde con el tipo de contenido "application/pdf"
    And la API lo entrega como adjunto
