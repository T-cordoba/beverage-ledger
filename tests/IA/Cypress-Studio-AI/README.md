# Cypress Cloud + Studio AI — Beverage Ledger

Segunda de las tres herramientas de IA evaluadas (ver [`../README.md`](../README.md)).

**Cypress Studio AI** añade `cy.prompt`: un paso de la prueba se escribe en lenguaje
natural ("type … in the "Nota" field") y Cypress Cloud lo traduce a comandos sobre el
DOM real en cada ejecución. Aquí cubre las mismas seis funcionalidades y los mismos
19 escenarios que las otras dos herramientas. Cada spec tiene un paso `cy.prompt`,
seguido siempre de la aserción original que comprueba que la IA hizo lo pedido.

| Funcionalidad | Archivo | Pruebas | Paso escrito con `cy.prompt` |
|---|---|---|---|
| RF-15 Salida (OUTBOUND) | `RF15-outbound.cy.ts` | 5 | escribir la nota de la salida |
| RF-16 Entrada (INBOUND) | `RF16-inbound.cy.ts` | 2 | escribir la nota de la entrada |
| RF-17 Traspaso (TRANSFER) | `RF17-transfer.cy.ts` | 4 | pulsar "Confirmar" en la barra de resumen |
| RF-18 Ajuste (ADJUSTMENT) | `RF18-adjustment.cy.ts` | 2 | escribir el motivo del ajuste |
| RF-20 Anulación | `RF20-cancellation.cy.ts` | 3 | pulsar "Anular" |
| RF-21 Comprobante PDF | `RF21-receipt.cy.ts` | 3 | abrir el "Detalle" del primer movimiento |

## Estructura

```text
tests/IA/Cypress-Studio-AI/
├── RF15-outbound.cy.ts … RF21-receipt.cy.ts   las seis suites (19 pruebas)
├── support/
│   ├── e2e.ts             comandos: visitApp, signInAsManager, byLabel, choose; anulación de lo registrado
│   ├── app.ts             selectores y utilidades comunes, guarda de escritura solo en local
│   └── movimientos.json   bodegas, notas, motivos, formato del nombre del PDF
├── reports/<nn-nombre>/   una carpeta por ejecución: junit.xml, resumen.txt, salida.txt, downloads/ (PDF), screenshots/
├── cypress.config.ts      projectId de Cloud, forceHttp1, límite de /auth/refresh, lectura de PDF, reporte
├── tsconfig.json
└── README.md
```

Es independiente de la suite Cypress del repo (`tests/cypress`): tiene su propia
config y no usa el preprocesador de Cucumber. Solo comparte las dependencias que ya
están en `package.json` (`cypress`, `@bahmutov/cypress-esbuild-preprocessor`).

## Requisitos

- Node.js 20+ y pnpm, y el binario de Cypress (`node node_modules/cypress/bin/cypress install` si falta).
- **Google Chrome**: `cy.prompt` solo funciona en navegadores Chromium.
- **Cypress Cloud**: un usuario con sesión iniciada (`cypress open` → Log in) y el
  `projectId` del proyecto (`q79b5v`, o el tuyo en `CYPRESS_PROJECT_ID`). Sin las dos
  cosas, `cypress run` falla con "Failed to download cy.prompt Cloud code". El plan
  gratuito admite 100 prompts por hora y usuario en ejecuciones no grabadas.
- El mismo entorno local desechable que las otras herramientas (Postgres en Docker,
  API en `:3001`, front en `:3000` apuntando a ella, segunda bodega "Barra E2E").
  Las pruebas que escriben en el ledger se saltan si el front o la API no son `localhost`.
- Credenciales de un usuario MANAGER local en la shell (`TEST_USER_EMAIL`,
  `TEST_USER_PASSWORD`) o en `tests/IA/Cypress-Studio-AI/.env`, que la regla `.env*`
  del repo deja fuera de git.

## Ejecución (PowerShell, desde la raíz del repo)

```powershell
$env:TEST_USER_EMAIL = 'manager@test.com'
$env:TEST_USER_PASSWORD = '<contraseña del manager local>'
$env:IA_RUN = '15-suite'   # nombre de la carpeta de reports/; sin él se usa la hora

# Las seis funcionalidades
node node_modules/cypress/bin/cypress run --config-file tests/IA/Cypress-Studio-AI/cypress.config.ts --browser chrome

# Una funcionalidad
node node_modules/cypress/bin/cypress run --config-file tests/IA/Cypress-Studio-AI/cypress.config.ts --browser chrome --spec tests/IA/Cypress-Studio-AI/RF15-outbound.cy.ts
```

Variables opcionales: `IA_BASE_URL` (front) e `IA_API_URL` (API).

## Resultados

Todas las ejecuciones son reales, contra el entorno local, con Cypress 16.2.0 y
Chrome 155 (26/10/2026). Cada una tiene su carpeta en `reports/`:

| Carpeta | Qué se ejecutó | Resultado |
|---|---|---|
| `03-RF15-outbound/` … `08-RF21-receipt/` | Cada funcionalidad por separado | 5/5, 2/2, 4/4, 2/2, 3/3, 3/3 |
| `09-suite-completa/` | Las 19 | 18 ✓ · 1 ✘ (RF-16: `pageLoadTimeout` de 60 s, página detenida en "Cargando tu sesión") |
| `10-suite-completa/` | Las 19 | 19 ✓ |
| `11-RF15-forceHttp1/` | RF-15 tras activar `forceHttp1` | 5 ✓ |
| `12-` / `13-` / `14-suite-forceHttp1/` | Las 19, tres veces seguidas | 19 ✓ en cada una |
| `15-suite-ui-actual/` | Las 19 de `14`, sin cambios, contra la interfaz del 24/10/2026 | 0 ✓ · 6 ✘ · 13 omitidas (error de hidratación en la primera visita de cada spec) |
| `18-suite-reparada/` | Las 19 tras las correcciones manuales de abajo | **19 ✓** |

`01`–`14` se ejecutaron contra la interfaz anterior al 24/10; `18` es la única
ejecución contra la interfaz actual. Las sondas de diagnóstico intermedias (`00`–`02`,
`16`, `17`) quedan solo en local.

## Adaptación a la interfaz del 24/10/2026 (a mano)

Las correcciones de `18` las hice a mano; `cy.prompt` no reparó nada. Los seis pasos
`cy.prompt` siguen igual.

- **Hidratación (`support/e2e.ts`).** El proxy de Cypress reescribe `<head>` y deja un
  nodo de texto en blanco delante del `<script>` de preferencias que `layout.tsx`
  pone primero; React lo ve al hidratar y lanza "Hydration failed" en todas las pruebas.
  Un `window:before:load` quita solo un nodo de texto en blanco al inicio de `<head>`. No
  se filtra ninguna excepción: cualquier otro desajuste con el HTML del servidor sigue
  haciendo fallar la prueba. No se tocó `src/`.
- **Textos nuevos.** "Esto registra 1 producto en el historial de movimientos…" y
  "No se registró nada." (RF-15).
- **Tope del stepper.** El `title` "Solo quedan N en esta bodega" ya no existe; se
  verifica el texto exacto que la tarjeta muestra ahora ("Ya tomaste las N unidades…",
  "Quedan N unidades: no alcanza para otra caja…") y se mantiene `be.disabled` (RF-15, RF-17).
- **Sin fecha en la captura.** RF-16 comprueba "Se registrará con la fecha y hora
  actuales." y que el botón "Ahora" ya no exista.

**Resultado vigente: 19/19** contra la interfaz actual (`18-suite-reparada/`, una
ejecución) y 19/19 contra la anterior (`14-suite-forceHttp1/`, estable en tres
ejecuciones completas seguidas).

## Problemas encontrados y corregidos

- **Cuelgue intermitente de la carga (`09`).** Unas 2 de cada ~150 visitas, Chrome
  dejaba sin terminar los chunks de Next y la página no llegaba al evento `load`. Se
  atribuye a la interceptación por CDP Fetch que Cypress 16 activa por defecto.
  `forceHttp1: true` devuelve Chrome al proxy anterior (Cypress muestra un aviso de
  obsolescencia) y no volvió a ocurrir; `cy.prompt` sigue funcionando.
- **Límite de `/auth/refresh` (429).** La API admite 10 por minuto por IP y la app
  pide uno en cada carga en frío. `cy.visitApp` espera turno (máximo 8 por 61 s,
  registrado en `reports/.refresh-log.json`, que no se versiona).
- **Sesión única por spec.** Los refresh tokens rotan con detección de reutilización,
  así que `testIsolation: false` y `cy.session` crean una sola sesión MANAGER por spec.
- **Limpieza.** `afterEach` anula por API los movimientos que registró la prueba.
- **Ajustes de las pruebas:** RF-15 leía la tarjeta antes de cargar el saldo (NaN);
  el alias de la entrada propia de RF-20/21 pasó a `{ type: 'static' }`; RF-17 compara
  el saldo del destino de forma relativa porque "Barra E2E" ya tenía existencias.
