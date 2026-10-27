# Ejecución 15-rf17-rf20-validacion

- Inicio: 2026-10-27T03:40:36.964Z · Fin: 2026-10-27T03:46:33.244Z · Duración: 6 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=true)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1
- RAM libre durante la ejecución: mínima 105 MB · media 500 MB

**Escenarios: 7 · aprobados 6 · fallidos 1 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-17 | 4 | 0 | 0 |
| RF-20 | 2 | 1 | 0 |

| Escenario | Resultado |
|---|---|
| RF17-01 Origen y destino son obligatorios para confirmar | aprobada |
| RF17-02 El destino excluye al origen y viceversa | aprobada |
| RF17-03 Registrar un traspaso mueve la existencia entre las dos bodegas | aprobada |
| RF17-04 Las cantidades del traspaso se topan con la existencia del origen | aprobada |
| RF20-01 Conservarlo cierra el diálogo sin anular | aprobada |
| RF20-02 El motivo es obligatorio al anular | fallida |
| RF20-03 Anular con motivo válido revierte la existencia | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| observe | 56 | 0 |
| act(observe) | 70 | 0 |
| extract | 13 | 0 |
| rechazo | 0 | 5 |

Tokens (stagehand.metrics()): entrada 128347 · salida 3424 · razonamiento 0 · inferencia 277 s

## Fallos

- **RF20-02** El motivo es obligatorio al anular: La IA no extrajo el dato correcto en 3 intentos (Extrae el estado del movimiento de esta página de detalle: la palabra en español que aparece en la etiqueta junto al tipo de movimiento, copiada sin traducir (por ejemplo "confirmado" o "anulado")): el estado no es «confirmed»
