# Ejecución 04-rf15

- Inicio: 2026-10-27T02:00:24.255Z · Fin: 2026-10-27T02:05:32.969Z · Duración: 5 min
- Stagehand 4.3.0 · Node v24.22.1 · navegador local (Chrome, headless=false)
- Proveedor de IA: Ollama local · modelo `qwen2.5:7b` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1

**Escenarios: 5 · aprobados 1 · fallidos 4 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-15 | 1 | 4 | 0 |

| Escenario | Resultado |
|---|---|
| RF15-01 Registrar una salida correcta descuenta la existencia | fallida |
| RF15-02 Sin productos no aparece la barra Confirmar | fallida |
| RF15-03 Cantidades incorrectas: no baja de cero y el tope es la existencia | fallida |
| RF15-04 Inventario insuficiente: botellas y cajas comparten el tope | fallida |
| RF15-05 Volver del diálogo y Descartar no escriben en el historial | aprobada |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| act | 18 | 1 |
| observe | 3 | 0 |
| extract | 3 | 0 |
| act(observe) | 10 | 0 |

Tokens (stagehand.metrics()): entrada 70437 · salida 2143 · razonamiento 0 · inferencia 202 s

## Fallos

- **RF15-01** Registrar una salida correcta descuenta la existencia: Tiempo agotado esperando: el detalle del movimiento. Último valor: "/movements/new/outbound"
- **RF15-02** Sin productos no aparece la barra Confirmar: Tiempo agotado esperando: 0 unidades en total en la tarjeta de «1942». Último valor: {"name":"1942","stock":201,"left":200,"total":1,"limit":"","text":"1942 DON JULIO 201 en existencia · quedan 200 CATEGORÍA TEQUILA & OTHER AGAVE SPIRITS TIPO Añejo GRADUACIÓN 40% ORIGEN Mexico BOTELLAS − 1 + CAJAS × 12 unidades − 0 + 1 unidad en total","addBottle":{"exists":true,"disabled":false},"removeBottle":{"exists":true,"disabled":false},"addCase":{"exists":true,"disabled":false},"removeCase":{"exists":true,"disabled":false}}
- **RF15-03** Cantidades incorrectas: no baja de cero y el tope es la existencia: Tiempo agotado esperando: 1 unidades en total en la tarjeta de «ABSOLUTE ELYX». Último valor: {"name":"ABSOLUTE ELYX","stock":20,"left":null,"total":0,"limit":"","text":"ABSOLUTE ELYX ABSOLUT 20 en existencia CATEGORÍA VODKA & AQUAVIT TIPO Premium Vodka GRADUACIÓN 42.3% ORIGEN Sweden BOTELLAS − 0 + CAJAS × 12 unidades − 0 + 0 unidades en total","addBottle":{"exists":true,"disabled":false},"removeBottle":{"exists":true,"disabled":false},"addCase":{"exists":true,"disabled":false},"removeCase":{"exists":true,"disabled":false}}
- **RF15-04** Inventario insuficiente: botellas y cajas comparten el tope: act no pudo completar «Abre el selector "Bodega"»: Failed to perform act: -32602 Invalid mouse button → Action [click] performed successfully on selector: xpath=/html[1]/body[1]/div[2]/div[1]/main[1]/div[1]/div[1]/div[1]/button[1]
