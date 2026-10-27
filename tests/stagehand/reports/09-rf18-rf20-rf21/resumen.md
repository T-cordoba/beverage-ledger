# Ejecución 09-rf18-rf20-rf21

- Inicio: 2026-10-27T02:33:07.815Z · Fin: 2026-10-27T02:38:28.770Z · Duración: 5 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=false)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 0

**Escenarios: 8 · aprobados 8 · fallidos 0 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-18 | 2 | 0 | 0 |
| RF-20 | 3 | 0 | 0 |
| RF-21 | 3 | 0 | 0 |

| Escenario | Resultado |
|---|---|
| RF18-01 El motivo es obligatorio y de al menos 4 caracteres | aprobada |
| RF18-02 Registrar un ajuste con motivo válido | aprobada |
| RF20-01 Conservarlo cierra el diálogo sin anular | aprobada |
| RF20-02 El motivo es obligatorio al anular | aprobada |
| RF20-03 Anular con motivo válido revierte la existencia | aprobada |
| RF21-01 Descargar el PDF desde el historial | aprobada |
| RF21-02 Descargar el PDF desde el detalle | aprobada |
| RF21-03 Descargar el PDF de un movimiento anulado | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 16 | 0 |
| observe | 38 | 0 |
| act(observe) | 37 | 0 |
| extract | 11 | 0 |
| rechazo | 0 | 1 |

Tokens (stagehand.metrics()): entrada 104124 · salida 3177 · razonamiento 0 · inferencia 240 s
