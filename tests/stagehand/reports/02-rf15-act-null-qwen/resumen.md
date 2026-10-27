# Ejecución 02-rf15

- Inicio: 2026-10-27T01:49:51.723Z · Fin: 2026-10-27T01:50:03.962Z · Duración: 0 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=false)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1

**Escenarios: 5 · aprobados 0 · fallidos 5 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-15 | 0 | 5 | 0 |

| Escenario | Resultado |
|---|---|
| RF15-01 Registrar una salida correcta descuenta la existencia | fallida |
| RF15-02 Sin productos no aparece la barra Confirmar | fallida |
| RF15-03 Cantidades incorrectas: no baja de cero y el tope es la existencia | fallida |
| RF15-04 Inventario insuficiente: botellas y cajas comparten el tope | fallida |
| RF15-05 Volver del diálogo y Descartar no escriben en el historial | fallida |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 0 | 1 |

Tokens (stagehand.metrics()): entrada 1316 · salida 16 · razonamiento 0 · inferencia 2 s
