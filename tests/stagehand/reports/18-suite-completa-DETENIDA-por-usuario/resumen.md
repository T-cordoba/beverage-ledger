# Ejecución 18-suite-completa

- Inicio: 2026-10-27T04:00:08.091Z · Fin: 2026-10-27T04:04:07.891Z · Duración: 4 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=true)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1
- RAM libre durante la ejecución: mínima 73 MB · media 720 MB
- **Ejecución detenida:** Detenida a petición del usuario: no ejecutar más pruebas por falta de RAM (2026-10-27T04:03:24Z)

**Escenarios: 19 · aprobados 6 · fallidos 13 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-15 | 5 | 0 | 0 |
| RF-16 | 1 | 1 | 0 |
| RF-17 | 0 | 4 | 0 |
| RF-18 | 0 | 2 | 0 |
| RF-20 | 0 | 3 | 0 |
| RF-21 | 0 | 3 | 0 |

| Escenario | Resultado |
|---|---|
| RF15-01 Registrar una salida correcta descuenta la existencia | aprobada |
| RF15-02 Sin productos no aparece la barra Confirmar | aprobada |
| RF15-03 Cantidades incorrectas: no baja de cero y el tope es la existencia | aprobada |
| RF15-04 Inventario insuficiente: botellas y cajas comparten el tope | aprobada |
| RF15-05 Volver del diálogo y Descartar no escriben en el historial | aprobada |
| RF16-01 Registrar una entrada y verla en el detalle y el historial | aprobada |
| RF16-02 Validación de la entrada: sin líneas no hay confirmación y Volver no registra | fallida |
| RF17-01 Origen y destino son obligatorios para confirmar | fallida |
| RF17-02 El destino excluye al origen y viceversa | fallida |
| RF17-03 Registrar un traspaso mueve la existencia entre las dos bodegas | fallida |
| RF17-04 Las cantidades del traspaso se topan con la existencia del origen | fallida |
| RF18-01 El motivo es obligatorio y de al menos 4 caracteres | fallida |
| RF18-02 Registrar un ajuste con motivo válido | fallida |
| RF20-01 Conservarlo cierra el diálogo sin anular | fallida |
| RF20-02 El motivo es obligatorio al anular | fallida |
| RF20-03 Anular con motivo válido revierte la existencia | fallida |
| RF21-01 Descargar el PDF desde el historial | fallida |
| RF21-02 Descargar el PDF desde el detalle | fallida |
| RF21-03 Descargar el PDF de un movimiento anulado | fallida |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| observe | 31 | 0 |
| act(observe) | 57 | 0 |
| extract | 5 | 0 |

Tokens (stagehand.metrics()): entrada 66822 · salida 2393 · razonamiento 0 · inferencia 157 s
