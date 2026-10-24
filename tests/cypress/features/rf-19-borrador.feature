# language: es
@rf-19
Característica: RF-19 Guardar y retomar un borrador de movimiento
  Como encargada de bodega
  Quiero que lo que capturé no se pierda si recargo la página
  Para no volver a contar una salida a medio registrar

  Escenario: El borrador sobrevive a una recarga y se puede descartar
    Dado Camila ingresó a la aplicación
    Cuando ella abre "Registrar una salida"
    Y ella añade 2 botellas sin confirmar
    Y ella recarga la página
    Entonces el resumen del borrador dice "2 unidades"
    Cuando ella descarta el borrador
    Entonces ya no queda ningún borrador pendiente
