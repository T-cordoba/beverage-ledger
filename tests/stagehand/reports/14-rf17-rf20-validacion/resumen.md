# Ejecución 14-rf17-rf20-validacion

- Inicio: 2026-10-27T03:34:08.896Z · Fin: 2026-10-27T03:39:43.756Z · Duración: 6 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=true)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1
- RAM libre durante la ejecución: mínima 295 MB · media 655 MB

**Escenarios: 7 · aprobados 4 · fallidos 3 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-17 | 2 | 2 | 0 |
| RF-20 | 2 | 1 | 0 |

| Escenario | Resultado |
|---|---|
| RF17-01 Origen y destino son obligatorios para confirmar | fallida |
| RF17-02 El destino excluye al origen y viceversa | fallida |
| RF17-03 Registrar un traspaso mueve la existencia entre las dos bodegas | aprobada |
| RF17-04 Las cantidades del traspaso se topan con la existencia del origen | aprobada |
| RF20-01 Conservarlo cierra el diálogo sin anular | aprobada |
| RF20-02 El motivo es obligatorio al anular | fallida |
| RF20-03 Anular con motivo válido revierte la existencia | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| observe | 49 | 0 |
| act(observe) | 62 | 0 |
| extract | 9 | 0 |
| rechazo | 0 | 4 |

Tokens (stagehand.metrics()): entrada 103174 · salida 2927 · razonamiento 0 · inferencia 229 s

## Fallos

- **RF17-01** Origen y destino son obligatorios para confirmar: Tiempo agotado esperando: la lista de «Hacia». Último valor: null
- **RF17-02** El destino excluye al origen y viceversa: Tiempo agotado esperando: la lista de «Desde». Último valor: null
- **RF20-02** El motivo es obligatorio al anular: La IA no encontró el campo «Motivo» en 3 intentos: Escribe %motivo% en el campo "Motivo" del diálogo
