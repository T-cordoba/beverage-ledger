# Ejecución 05-rf15

- Inicio: 2026-10-27T02:08:10.762Z · Fin: 2026-10-27T02:12:21.106Z · Duración: 4 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=false)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1

**Escenarios: 5 · aprobados 4 · fallidos 1 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-15 | 4 | 1 | 0 |

| Escenario | Resultado |
|---|---|
| RF15-01 Registrar una salida correcta descuenta la existencia | aprobada |
| RF15-02 Sin productos no aparece la barra Confirmar | aprobada |
| RF15-03 Cantidades incorrectas: no baja de cero y el tope es la existencia | aprobada |
| RF15-04 Inventario insuficiente: botellas y cajas comparten el tope | fallida |
| RF15-05 Volver del diálogo y Descartar no escriben en el historial | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 20 | 0 |
| observe | 3 | 0 |
| extract | 4 | 0 |
| act(observe) | 29 | 0 |

Tokens (stagehand.metrics()): entrada 65828 · salida 2036 · razonamiento 0 · inferencia 186 s

## Fallos

- **RF15-04** Inventario insuficiente: botellas y cajas comparten el tope: Tiempo agotado esperando: Barra E2E elegida. Último valor: {"text":"Bodega por defecto","disabled":false,"expanded":false}
