# language: es
@rf-24
Característica: RF-24 Consultar el kardex de un producto
  Como encargada de bodega
  Quiero ver el histórico de movimientos de un producto
  Para explicar de dónde sale su existencia actual

  Antecedentes:
    Dado Camila ingresó a la aplicación
    Y ella abre la sección "Existencias"

  @visual
  Escenario: El saldo del kardex coincide con la existencia
    Cuando ella abre el kardex del primer producto listado
    Entonces el kardex es del producto elegido
    Y el saldo más reciente coincide con lo que hay en existencia
