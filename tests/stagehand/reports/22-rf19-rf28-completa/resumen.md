# Ejecución 22-rf19-rf28-completa

- Inicio: 2026-10-27T07:54:21.090Z · Fin: 2026-10-27T08:03:40.161Z · Duración: 9 min
- Stagehand 4.3.0 · Node v24.19.0 · navegador local (Chrome, headless=true)
- Proveedor de IA: Ollama local · modelo `qwen2.5:latest` en http://localhost:11434/v1
- Front http://localhost:3000 · API http://localhost:3001
- Código de salida de node:test: 1
- RAM libre durante la ejecución: mínima 1139 MB · media 2186 MB

**Escenarios: 12 · aprobados 11 · fallidos 1 · omitidos 0**

| Requisito | Aprobados | Fallidos | Omitidos |
|---|---|---|---|
| RF-19 | 2 | 0 | 0 |
| RF-22 | 2 | 0 | 0 |
| RF-23 | 2 | 0 | 0 |
| RF-24 | 2 | 0 | 0 |
| RF-27 | 2 | 0 | 0 |
| RF-28 | 1 | 1 | 0 |

| Escenario | Resultado |
|---|---|
| RF19-01 El borrador sobrevive a salir de la vista y a recargar, y es propio de su tipo | aprobada |
| RF19-02 Un borrador vacío no se confirma, Volver no lo pierde y Descartar sí lo borra | aprobada |
| RF22-01 El listado de existencias muestra sus columnas y filas | aprobada |
| RF22-02 Sin sesión, /stock redirige al login y no muestra existencias | aprobada |
| RF23-01 Buscar un producto y filtrar por su categoría acota el listado | aprobada |
| RF23-02 Una búsqueda con comodín no devuelve nada y Limpiar filtros restaura el listado | aprobada |
| RF24-01 Abrir el kardex desde existencias y recorrer el saldo corrido | aprobada |
| RF24-02 El kardex de un producto inexistente avisa y deja volver a existencias | aprobada |
| RF27-01 La tarjeta Bajo mínimo lista los productos y lleva al kardex y a existencias | aprobada |
| RF27-02 La lista no trae de más: cada producto tiene mínimo y está marcado Bajo mínimo en existencias | aprobada |
| RF28-01 Cambiar el periodo y la agrupación actualiza resumen y ranking con cifras coherentes | aprobada |
| RF28-02 El periodo elegido se conserva al volver con el botón atrás (DEF-03) | fallida |

## Llamadas a la IA de Stagehand (ai-log.jsonl)

| Tipo | Correctas | Con error |
|---|---|---|
| observe | 42 | 0 |
| act(observe) | 42 | 0 |
| extract | 6 | 0 |
| rechazo | 0 | 2 |

Tokens (stagehand.metrics()): entrada 71947 · salida 2264 · razonamiento 0 · inferencia 409 s

## Fallos

- **RF28-02** El periodo elegido se conserva al volver con el botón atrás (DEF-03): Al volver, el periodo marcado es «Mes» y el rango 27/09/2026 – 27/10/2026, no 27/10/2025 – 27/10/2026  'Mes' !== 'Año' 
