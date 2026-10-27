# Ejecución 16-rf20-validacion

- Inicio: 2026-10-27T03:47:00.706Z · Fin: 2026-10-27T03:49:31.633Z · Duración: 3 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=true)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 0
- RAM libre durante la ejecución: mínima 206 MB · media 424 MB

**Escenarios: 3 · aprobados 3 · fallidos 0 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-20 | 3 | 0 | 0 |

| Escenario | Resultado |
|---|---|
| RF20-01 Conservarlo cierra el diálogo sin anular | aprobada |
| RF20-02 El motivo es obligatorio al anular | aprobada |
| RF20-03 Anular con motivo válido revierte la existencia | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| observe | 29 | 0 |
| act(observe) | 28 | 0 |
| extract | 8 | 0 |
| rechazo | 0 | 1 |

Tokens (stagehand.metrics()): entrada 40683 · salida 1749 · razonamiento 0 · inferencia 117 s
