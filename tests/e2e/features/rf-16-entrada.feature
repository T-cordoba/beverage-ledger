@web @rf-16
Feature: RF-16 Registrar una entrada de inventario
  Como encargada de bodega
  Quiero registrar lo que entrega el proveedor
  Para que las existencias suban cuando llega la mercancía

  Background:
    Given Camila ingresó a la aplicación

  @escribe-en-el-ledger
  Scenario: Una entrada confirmada queda registrada y se puede revertir
    When ella registra una entrada de 2 botellas
    Then ella ve el movimiento de tipo "Entrada" en estado "confirmado"
    And las líneas del movimiento son "2 botellas"
    When ella consulta en la API las existencias del producto del movimiento
    And ella anula el movimiento con el motivo "Limpieza de la prueba E2E"
    Then ella ve el movimiento de tipo "Entrada" en estado "anulado"
    And las existencias de ese producto en la API cambiaron en -2

  Scenario: Volver desde la confirmación no registra nada
    When ella abre la captura de entrada
    And ella añade 1 botella del primer producto disponible
    And ella pide confirmar el movimiento pero vuelve atrás
    Then ella sigue en la ruta "/movements/new/inbound"
    And el resumen del borrador dice "1 unidad"
    When ella descarta el borrador
    Then ya no queda ningún borrador pendiente
