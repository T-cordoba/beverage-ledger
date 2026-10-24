# language: es
@web @rf-16
Característica: RF-16 Registrar una entrada de inventario
  Como encargada de bodega
  Quiero registrar lo que entrega el proveedor
  Para que las existencias suban cuando llega la mercancía

  Antecedentes:
    Dado Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Escenario: Una entrada confirmada queda registrada y se puede revertir
    Cuando ella registra una entrada de 2 botellas
    Entonces ella ve el movimiento de tipo "Entrada" en estado "confirmado"
    Y las líneas del movimiento son "2 botellas"
    Cuando ella consulta en la API las existencias del producto del movimiento
    Y ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Entonces ella ve el movimiento de tipo "Entrada" en estado "anulado"
    Y las existencias de ese producto en la API cambiaron en -2

  Escenario: Volver desde la confirmación no registra nada
    Cuando ella abre la captura de entrada
    Y ella añade 1 botella del primer producto disponible
    Y ella pide confirmar el movimiento pero vuelve atrás
    Entonces ella sigue en la ruta "/movements/new/inbound"
    Y el resumen del borrador dice "1 unidad"
    Cuando ella descarta el borrador
    Entonces ya no queda ningún borrador pendiente
