# Ejecución 12-suite-completa

- Inicio: 2026-10-27T03:01:41.855Z · Fin: 2026-10-27T03:15:29.525Z · Duración: 14 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=true)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1
- RAM libre durante la ejecución: mínima 128 MB · media 560 MB

**Escenarios: 19 · aprobados 18 · fallidos 1 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-15 | 5 | 0 | 0 |
| RF-16 | 2 | 0 | 0 |
| RF-17 | 4 | 0 | 0 |
| RF-18 | 2 | 0 | 0 |
| RF-20 | 2 | 1 | 0 |
| RF-21 | 3 | 0 | 0 |

| Escenario | Resultado |
|---|---|
| RF15-01 Registrar una salida correcta descuenta la existencia | aprobada |
| RF15-02 Sin productos no aparece la barra Confirmar | aprobada |
| RF15-03 Cantidades incorrectas: no baja de cero y el tope es la existencia | aprobada |
| RF15-04 Inventario insuficiente: botellas y cajas comparten el tope | aprobada |
| RF15-05 Volver del diálogo y Descartar no escriben en el historial | aprobada |
| RF16-01 Registrar una entrada y verla en el detalle y el historial | aprobada |
| RF16-02 Validación de la entrada: sin líneas no hay confirmación y Volver no registra | aprobada |
| RF17-01 Origen y destino son obligatorios para confirmar | aprobada |
| RF17-02 El destino excluye al origen y viceversa | aprobada |
| RF17-03 Registrar un traspaso mueve la existencia entre las dos bodegas | aprobada |
| RF17-04 Las cantidades del traspaso se topan con la existencia del origen | aprobada |
| RF18-01 El motivo es obligatorio y de al menos 4 caracteres | aprobada |
| RF18-02 Registrar un ajuste con motivo válido | aprobada |
| RF20-01 Conservarlo cierra el diálogo sin anular | aprobada |
| RF20-02 El motivo es obligatorio al anular | aprobada |
| RF20-03 Anular con motivo válido revierte la existencia | fallida |
| RF21-01 Descargar el PDF desde el historial | aprobada |
| RF21-02 Descargar el PDF desde el detalle | aprobada |
| RF21-03 Descargar el PDF de un movimiento anulado | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 33 | 0 |
| observe | 79 | 0 |
| act(observe) | 120 | 0 |
| extract | 18 | 0 |
| rechazo | 0 | 1 |

Tokens (stagehand.metrics()): entrada 267251 · salida 7313 · razonamiento 0 · inferencia 629 s

## Fallos

- **RF20-03** Anular con motivo válido revierte la existencia: La IA leyó el estado «null» + actual - expected  + 'null' - 'confirmado' 
