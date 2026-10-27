# Ejecución 06-rf15-rf16

- Inicio: 2026-10-27T02:13:03.851Z · Fin: 2026-10-27T02:18:49.609Z · Duración: 6 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=false)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1

**Escenarios: 7 · aprobados 6 · fallidos 1 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-15 | 5 | 0 | 0 |
| RF-16 | 1 | 1 | 0 |

| Escenario | Resultado |
|---|---|
| RF15-01 Registrar una salida correcta descuenta la existencia | aprobada |
| RF15-02 Sin productos no aparece la barra Confirmar | aprobada |
| RF15-03 Cantidades incorrectas: no baja de cero y el tope es la existencia | aprobada |
| RF15-04 Inventario insuficiente: botellas y cajas comparten el tope | aprobada |
| RF15-05 Volver del diálogo y Descartar no escriben en el historial | aprobada |
| RF16-01 Registrar una entrada y verla en el detalle y el historial | fallida |
| RF16-02 Validación de la entrada: sin líneas no hay confirmación y Volver no registra | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 32 | 0 |
| observe | 3 | 0 |
| extract | 5 | 0 |
| act(observe) | 29 | 0 |

Tokens (stagehand.metrics()): entrada 91043 · salida 2673 · razonamiento 0 · inferencia 242 s

## Fallos

- **RF16-01** Registrar una entrada y verla en el detalle y el historial: Tiempo agotado esperando: el detalle del movimiento. Último valor: "/movements"
