# Ejecución 08-rf18-rf20-rf21

- Inicio: 2026-10-27T02:26:57.826Z · Fin: 2026-10-27T02:32:01.059Z · Duración: 5 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=false)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1

**Escenarios: 8 · aprobados 3 · fallidos 5 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-18 | 1 | 1 | 0 |
| RF-20 | 0 | 3 | 0 |
| RF-21 | 2 | 1 | 0 |

| Escenario | Resultado |
|---|---|
| RF18-01 El motivo es obligatorio y de al menos 4 caracteres | fallida |
| RF18-02 Registrar un ajuste con motivo válido | aprobada |
| RF20-01 Conservarlo cierra el diálogo sin anular | fallida |
| RF20-02 El motivo es obligatorio al anular | fallida |
| RF20-03 Anular con motivo válido revierte la existencia | fallida |
| RF21-01 Descargar el PDF desde el historial | aprobada |
| RF21-02 Descargar el PDF desde el detalle | aprobada |
| RF21-03 Descargar el PDF de un movimiento anulado | fallida |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 14 | 0 |
| observe | 31 | 0 |
| act(observe) | 29 | 0 |
| rechazo | 0 | 2 |
| extract | 8 | 0 |

Tokens (stagehand.metrics()): entrada 83122 · salida 2661 · razonamiento 0 · inferencia 199 s

## Fallos

- **RF18-01** El motivo es obligatorio y de al menos 4 caracteres: Tiempo agotado esperando: el motivo escrito. Último valor: {"label":"Motivo* (obligatorio)","value":"ab    ","invalid":true,"placeholder":"Rotura, diferencia de conteo…"}
- **RF20-01** Conservarlo cierra el diálogo sin anular: La IA leyó el estado «confirmed» + actual - expected  + 'confirmed' - 'confirmado'           ^ 
- **RF20-02** El motivo es obligatorio al anular: Expected values to be strictly equal:  '    ab' !== 'ab' 
- **RF20-03** Anular con motivo válido revierte la existencia: La IA leyó el estado «confirmed» + actual - expected  + 'confirmed' - 'confirmado'           ^ 
- **RF21-03** Descargar el PDF de un movimiento anulado: Tiempo agotado esperando: el texto «Anulado el». Último valor: "Beverage Ledger Demo Panel Existencias Movimientos Catálogo Reportes ? MK ← Volver MOV-2026-000967 Entrada anulado PDF OCURRIÓ EL 26 de octubre de 2026 a las 21:31 REGISTRADO POR Manager Katalon (local) CREADO EL 26 de octubre de 2026 a las 21:31 CONFIRMADO EL 26 de octubre de 2026 a las 21:31 ANULADO EL 26 de octubre de 2026 a las 21:31 Líneas (1) 1942 DON JULIO 1 unidad base 1 botella"
