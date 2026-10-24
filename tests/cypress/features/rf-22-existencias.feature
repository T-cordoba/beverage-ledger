# language: es
@rf-22
Característica: RF-22 Consultar las existencias actuales
  Como encargada de bodega
  Quiero ver cuánto hay de cada producto
  Para saber qué puedo despachar sin contar a mano

  Antecedentes:
    Dado Camila ingresó a la aplicación

  Escenario: Ver la tabla de existencias
    Cuando ella abre la sección "Existencias"
    Entonces ella ve el título "Existencias"
    Y la tabla de existencias lista al menos un producto
    Y el conteo de resultados tiene la forma "X–Y de N resultados"
