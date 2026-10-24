# language: es
@rf-27
Característica: RF-27 Ver los productos bajo mínimo
  Como encargada de bodega
  Quiero ver en el panel qué productos están por debajo de su mínimo
  Para reponerlos antes de quedarme sin stock

  Escenario: El panel muestra la tarjeta de bajo mínimo
    Dado Camila ingresó a la aplicación
    Entonces ella ve la tarjeta "Bajo mínimo"
    Y la tarjeta lista productos o dice "Nada está por debajo de su mínimo."
