# Ejecución 07-rf16-rf17

- Inicio: 2026-10-27T02:21:30.130Z · Fin: 2026-10-27T02:26:48.867Z · Duración: 5 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=false)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 0

**Escenarios: 6 · aprobados 6 · fallidos 0 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-16 | 2 | 0 | 0 |
| RF-17 | 4 | 0 | 0 |

| Escenario | Resultado |
|---|---|
| RF16-01 Registrar una entrada y verla en el detalle y el historial | aprobada |
| RF16-02 Validación de la entrada: sin líneas no hay confirmación y Volver no registra | aprobada |
| RF17-01 Origen y destino son obligatorios para confirmar | aprobada |
| RF17-02 El destino excluye al origen y viceversa | aprobada |
| RF17-03 Registrar un traspaso mueve la existencia entre las dos bodegas | aprobada |
| RF17-04 Las cantidades del traspaso se topan con la existencia del origen | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 14 | 0 |
| observe | 25 | 0 |
| act(observe) | 40 | 0 |
| extract | 4 | 0 |
| rechazo | 0 | 1 |

Tokens (stagehand.metrics()): entrada 110545 · salida 2418 · razonamiento 0 · inferencia 234 s
