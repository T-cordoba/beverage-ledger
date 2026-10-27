# Ejecución 03-rf15

- Inicio: 2026-10-27T01:55:48.073Z · Fin: 2026-10-27T01:58:43.161Z · Duración: 3 min
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
| act | 10 | 2 |
| extract | 2 | 0 |

Tokens (stagehand.metrics()): entrada 27078 · salida 837 · razonamiento 0 · inferencia 88 s

## Fallos

- **RF15-01** Registrar una salida correcta descuenta la existencia: [   {     "origin": "string",     "code": "invalid_format",     "format": "regex",     "pattern": "/^\\d+-\\d+$/",     "path": [       "structuredContent",       "action",       "elementId"     ],     "message": "Invalid input"   } ]
- **RF15-02** Sin productos no aparece la barra Confirmar: Expected values to be strictly equal: + actual - expected  + 'DON JULIO' - '1942' 
- **RF15-03** Cantidades incorrectas: no baja de cero y el tope es la existencia: La IA no extrajo la tarjeta «1942»
- **RF15-04** Inventario insuficiente: botellas y cajas comparten el tope: Tiempo agotado esperando: las tarjetas de producto del selector. Último valor: []
- **RF15-05** Volver del diálogo y Descartar no escriben en el historial: [   {     "origin": "string",     "code": "invalid_format",     "format": "regex",     "pattern": "/^\\d+-\\d+$/",     "path": [       "structuredContent",       "action",       "elementId"     ],     "message": "Invalid input"   } ]
