# Suite completa — Playwright MCP + Copilot

## Resultado final

| Total | Aprobadas | Fallidas | Omitidas |
| ----: | --------: | -------: | -------: |
|    19 |        19 |        0 |        0 |

La última ejecución fue `npx playwright test --config playwright.config.ts`, en un solo worker. Playwright informó `19 passed (6.5m)`. JUnit confirma 19 casos, 0 fallos y 0 omitidos.

## Resultado individual de los 19 casos

### RF-15 Salida — 5/5 aprobadas

- Registrar una salida correcta
- Sin productos no aparece la barra Confirmar
- Cantidades incorrectas: quitar por debajo de cero y tope del stepper
- Inventario insuficiente por tope compartido botellas/cajas
- Volver del diálogo y Descartar no escriben en el ledger

### RF-16 Entrada — 2/2 aprobadas

- Registrar una entrada y verla en detalle e historial
- Validación de la entrada: sin líneas y diálogo con Volver

### RF-17 Traspaso — 4/4 aprobadas

- Origen y destino obligatorios
- El destino excluye al origen
- Registrar un traspaso y verificar las dos puntas
- Cantidades del traspaso topadas por el origen

### RF-18 Ajuste — 2/2 aprobadas

- Motivo obligatorio de al menos 4 caracteres
- Registrar un ajuste con motivo válido

### RF-20 Anulación — 3/3 aprobadas

- Conservarlo cancela la anulación
- Motivo obligatorio al anular
- Anular con motivo válido

### RF-21 Comprobante PDF — 3/3 aprobadas

- Descargar el PDF desde el historial
- Descargar el PDF desde el detalle
- Descargar el PDF de un movimiento anulado

## Corridas y correcciones

1. Corrida inicial completa: **17 aprobadas, 2 fallidas, 0 omitidas**. RF-17 comparaba incorrectamente el total del destino con el saldo del origen (190 esperado frente a 16 observado). RF-20 falló por ambigüedad del locator de «confirmado» que encontraba tres badges.
2. Corridas dirigidas: RF-17 **4/4 aprobadas**; RF-20 **3/3 aprobadas**.
3. Corrida completa final, posterior a las correcciones: **19/19 aprobadas**.

La corrección de RF-17 lee de la interfaz los saldos iniciales y finales de origen y destino por separado. RF-20 conserva la aserción y selecciona una coincidencia visible del badge repetido.

## Inventario y control de HTTP 429

Los casos de movimiento comparan contra saldos reales leídos en tarjetas o filas de `/stock`; RF-17 lee cada bodega por separado. Los números de unidades del movimiento son deltas de escenario, no saldos absolutos precargados.

`support/fixtures.ts` registra respuestas HTTP 429 en el contexto del navegador. Si ocurre durante el inicio de sesión o un caso, la ejecución falla explícitamente, incluso si el login hubiera reintentado; las llamadas de limpieza también exigen respuestas exitosas. En las corridas dirigidas y la final no se observó ningún HTTP 429. La navegación MCP mostró un 401 de `/auth/refresh` antes del login, esperado para una sesión sin cookie; el login real completó a `/dashboard`. No se interpretó ese 401 como un 429 ni se ocultó.

## Evidencias y archivos

- Reportes finales: [JUnit](../../reports/junit.xml), [HTML](../../reports/html/index.html) y artefactos Playwright en `../../reports/artifacts/`.
- Evidencia MCP: navegación/login y snapshots locales en `../mcp/`.
- Requisitos: [RF-15](./RF15-resumen.md), [RF-16](./RF16-resumen.md), [RF-17](./RF17-resumen.md), [RF-18](./RF18-resumen.md), [RF-20](./RF20-resumen.md), [RF-21](./RF21-resumen.md).
- El trabajo permaneció en `ci/jenkins-pipeline`; no se modificó el backend ni las otras suites y no se hizo commit ni push.
