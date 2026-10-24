# language: es
@web @rf-21
Característica: RF-21 Descargar el comprobante de un movimiento
  Como encargada de bodega
  Quiero descargar el comprobante en PDF de un movimiento
  Para archivarlo o entregarlo a quien recibió la mercancía

  Antecedentes:
    Dado Camila ingresó a la aplicación

  Escenario: Descargar el comprobante desde el detalle del movimiento
    Cuando ella abre el movimiento más reciente del historial
    Y ella descarga el comprobante del movimiento
    Entonces el archivo descargado se llama como el código del movimiento
    Y el archivo descargado es un PDF

  Escenario: Descargar el comprobante desde el historial
    Cuando ella anota el movimiento más reciente del historial
    Y ella descarga el comprobante del primer movimiento del historial
    Entonces el archivo descargado se llama como el código del movimiento
    Y el archivo descargado es un PDF

  @api
  Escenario: La API entrega el comprobante como un PDF adjunto
    Cuando ella anota el movimiento más reciente del historial
    Y ella pide directamente a la API el comprobante de ese movimiento
    Entonces la API responde con estado 200
    Y la API responde con el tipo de contenido "application/pdf"
    Y la API lo entrega como adjunto
