# language: es
@rf-23
Característica: RF-23 Filtrar las existencias
  Como encargada de bodega
  Quiero buscar un producto por su nombre
  Para encontrarlo sin recorrer todas las páginas

  Antecedentes:
    Dado Camila ingresó a la aplicación
    Y ella abre la sección "Existencias"

  Escenario: Buscar por parte del nombre
    Cuando ella busca "AMARO" en las existencias
    Entonces todos los productos listados contienen "AMARO"

  Escenario: Búsqueda sin coincidencias
    Cuando ella busca "zzz-producto-que-no-existe" en las existencias
    Entonces ella ve el aviso "Ningún producto coincide con esos filtros."
