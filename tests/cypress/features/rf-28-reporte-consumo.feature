# language: es
@rf-28
Característica: RF-28 Consultar el reporte de consumo
  Como gerente
  Quiero ver qué se consume más en un periodo
  Para decidir qué comprar

  @visual
  Escenario: Ranking anual por categoría
    Dado Camila ingresó a la aplicación
    Cuando ella abre la sección "Reportes"
    Y ella elige la opción "Año"
    Y ella elige la opción "Por categoría"
    Entonces la opción "Por categoría" queda marcada
    Y el ranking empieza en la posición 1
