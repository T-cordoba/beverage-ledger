# Ejecución 21-rf24-validacion

- Inicio: 2026-10-27T07:52:58.339Z · Fin: 2026-10-27T07:54:12.245Z · Duración: 1 min
- Stagehand 4.3.0 · Node v24.19.0 · navegador local (Chrome, headless=true)
- Proveedor de IA: Ollama local · modelo `qwen2.5:latest` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 0
- RAM libre durante la ejecución: mínima 2938 MB · media 3151 MB

**Escenarios: 2 · aprobados 2 · fallidos 0 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-24 | 2 | 0 | 0 |

| Escenario | Resultado |
|---|---|
| RF24-01 Abrir el kardex desde existencias y recorrer el saldo corrido | aprobada |
| RF24-02 El kardex de un producto inexistente avisa y deja volver a existencias | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| observe | 5 | 0 |
| act(observe) | 5 | 0 |
| extract | 2 | 0 |
| rechazo | 0 | 1 |

Tokens (stagehand.metrics()): entrada 10823 · salida 306 · razonamiento 0 · inferencia 59 s
