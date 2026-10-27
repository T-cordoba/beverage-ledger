# Stagehand + Ollama — pruebas E2E con IA local

[Stagehand](https://github.com/browserbase/stagehand) es una librería de automatización
de navegador con IA: en lugar de selectores escritos a mano, recibe instrucciones en
lenguaje natural y un modelo de lenguaje decide sobre qué elemento actuar. Expone tres
primitivas, `act()` (actuar), `observe()` (encontrar elementos y proponer acciones) y
`extract()` (leer datos estructurados con un esquema).

Esta es la suite E2E de Beverage Ledger escrita con **Stagehand 4.3.0** y un modelo de lenguaje
**local** servido por **Ollama** (`qwen2.5:7b`). Sigue el enfoque del proyecto de
referencia del curso, [mauricioramirezv/Stagehand-E2E-AI](https://github.com/mauricioramirezv/Stagehand-E2E-AI):
navegador local con `localBrowser`, un `ClientLLM` propio que habla con la API
compatible con OpenAI de Ollama (`src/ollama-client.ts` del profesor →
`support/ollama-client.mts` aquí), el proveedor elegido con `AI_PROVIDER` y
aserciones determinísticas sobre el resultado. No usa Playwright ni claves de nube.

La suite tiene dos partes con el mismo arnés: los seis requisitos de movimientos (19
escenarios) y, más abajo, los seis de consulta y borrador (RF-19, 22, 23, 24, 27 y 28;
12 escenarios, ver [Segunda parte](#segunda-parte-rf-19-rf-22-rf-23-rf-24-rf-27-y-rf-28)).

Primera parte, seis requisitos funcionales y 19 escenarios:

| Requisito | Funcionalidad | Archivo | Escenarios |
|---|---|---|---|
| RF-15 | Salida de inventario (OUTBOUND) | `RF15-outbound.e2e.mts` | 5 |
| RF-16 | Entrada de inventario (INBOUND) | `RF16-inbound.e2e.mts` | 2 |
| RF-17 | Traspaso entre bodegas (TRANSFER) | `RF17-transfer.e2e.mts` | 4 |
| RF-18 | Ajuste de inventario (ADJUSTMENT) | `RF18-adjustment.e2e.mts` | 2 |
| RF-20 | Anulación de un movimiento confirmado | `RF20-cancellation.e2e.mts` | 3 |
| RF-21 | Descarga del comprobante PDF | `RF21-receipt.e2e.mts` | 3 |

| Id | Escenario |
|---|---|
| RF15-01 | Registrar una salida correcta descuenta la existencia |
| RF15-02 | Sin productos no aparece la barra Confirmar |
| RF15-03 | Cantidades incorrectas: no baja de cero y el tope es la existencia |
| RF15-04 | Inventario insuficiente: botellas y cajas comparten el tope |
| RF15-05 | Volver del diálogo y Descartar no escriben en el historial |
| RF16-01 | Registrar una entrada y verla en el detalle y el historial |
| RF16-02 | Validación de la entrada: sin líneas no hay confirmación y Volver no registra |
| RF17-01 | Origen y destino son obligatorios para confirmar |
| RF17-02 | El destino excluye al origen y viceversa |
| RF17-03 | Registrar un traspaso mueve la existencia entre las dos bodegas |
| RF17-04 | Las cantidades del traspaso se topan con la existencia del origen |
| RF18-01 | El motivo es obligatorio y de al menos 4 caracteres |
| RF18-02 | Registrar un ajuste con motivo válido |
| RF20-01 | Conservarlo cierra el diálogo sin anular |
| RF20-02 | El motivo es obligatorio al anular |
| RF20-03 | Anular con motivo válido revierte la existencia |
| RF21-01 | Descargar el PDF desde el historial |
| RF21-02 | Descargar el PDF desde el detalle |
| RF21-03 | Descargar el PDF de un movimiento anulado |

Las reglas de negocio de cada escenario salen de las suites existentes
(`tests/IA/Playwright-Test-Agents`, reparada contra la interfaz actual); no se
modificó ninguna. El login solo prepara la sesión y no cuenta como escenario.

## Resultados reales

**No existe una ejecución completa con 19/19.** Cada escenario ha pasado en
ejecuciones reales, pero nunca los 19 en una misma ejecución: la mejor ejecución
completa fue 18/19, y las dos últimas se detuvieron (por memoria y a petición) sin
terminar. Todo lo que sigue sale de `reports/<ejecución>/resumen.md` y
`escenarios.jsonl`.

### Por requisito, en grupo

| Requisito | Grupo completo aprobado en | Con el código actual |
|---|---|---|
| RF-15 | **5/5** en `06-rf15-rf16`, `12-suite-completa` y `18-…-DETENIDA-por-usuario` | ✅ 5/5 (`18`) |
| RF-16 | **2/2** en `07-rf16-rf17`, `12-suite-completa` y `13-suite-completa` | ⚠️ RF16-01 ✅ (`18`); RF16-02 **no validado** |
| RF-17 | **4/4** en `07-rf16-rf17`, `12`, `13` y `15-rf17-rf20-validacion` | ✅ 4/4 (`15`) |
| RF-18 | **2/2** en `09-rf18-rf20-rf21`, `12` y `13` | ⚠️ **no validado** |
| RF-20 | **3/3** en `09-rf18-rf20-rf21` y `16-rf20-validacion` | ✅ 3/3 (`16`) |
| RF-21 | **3/3** en `09-rf18-rf20-rf21`, `12` y `13` | ⚠️ **no validado** |

**Con el código actual hay 13 de 19 escenarios validados en ejecución** (RF-15 5,
RF16-01, RF-17 4, RF-20 3). Los otros 6 (RF16-02, RF18-01, RF18-02, RF21-01,
RF21-02, RF21-03) pasaron con versiones anteriores del código y no se han vuelto a
ejecutar después de los últimos cambios (escritura validada con `ai.fill`, clic
forzado tras validar, espera de códigos en el historial). Usan el mismo código que
ya pasó en otros escenarios —`ai.fill` del motivo en un diálogo (RF-20), la nota en
la página (RF15-01) y el buscador del historial (RF16-01)—, pero eso es una
inferencia, no una ejecución.

`15-rf17-rf20-validacion` cuenta para RF-17 con el código actual porque entre esa
ejecución y la actual solo cambió `RF20-cancellation.e2e.mts`.

### Ejecuciones completas (19 escenarios)

| Ejecución | Resultado | Qué pasó |
|---|---|---|
| `10-suite-completa-INTERRUMPIDA-sin-memoria` | 10 ✔ · 3 ✖ · 6 sin ejecutar | Claude Code cortó la suite, la API y el front por falta de RAM |
| `11-suite-completa-DETENIDA-para-corregir` | 3 ✔ · 1 ✖ · resto detenido | Detenida a mano para aplicar una corrección (RF15-01) |
| `12-suite-completa` | **18 ✔ · 1 ✖** | Completa. Falló RF20-03: el modelo leyó el estado como `"null"` |
| `13-suite-completa` | **17 ✔ · 2 ✖** | Completa. RF15-05 (la suite leyó el historial antes de que se pintaran los códigos) y RF20-02 (el modelo eligió el mensaje de error como campo) |
| `17-suite-completa-DETENIDA-memoria` | 4 ✔ · resto detenido | El vigilante de memoria la paró (300 MB libres durante 30 s) |
| `18-suite-completa-DETENIDA-por-usuario` | 6 ✔ · resto detenido | Detenida por decisión de la usuaria: el equipo no tiene RAM para seguir |

Los escenarios "detenidos" fallan con `Ejecución detenida antes de este escenario`
(nunca se marcan como omitidos), por eso `junit.xml` de esas ejecuciones los cuenta
como fallidos.

### Historial de depuración

`01`–`09` y `14`–`16` son ejecuciones por requisito mientras se corregía la
integración con el modelo local; `debug-*` y `probe-*` son diagnósticos puntuales
(prompts reales enviados a Ollama y sus respuestas, con el correo de la cuenta
enmascarado). Cada corrección de la sección siguiente cita la ejecución donde se
observó el fallo. Las capturas de las ejecuciones intermedias (03–05, 08, 10, 11,
14, 17) no se versionan por tamaño; el resto de su evidencia sí.

## Segunda parte: RF-19, RF-22, RF-23, RF-24, RF-27 y RF-28

Mismo arnés (`defineSuite`, `ai.click`/`ai.fill`/`ai.extractChecked` validados contra el
DOM), dos escenarios por requisito —uno exitoso y uno no exitoso—, alineados con
`docs/black-box/` y el plan de BugBug (`docs/bugbug/plans/`).

| Requisito | Funcionalidad | Archivo | Escenarios |
|---|---|---|---|
| RF-19 | Guardar y retomar un borrador de movimiento | `RF19-draft.e2e.mts` | 2 |
| RF-22 | Consultar las existencias actuales | `RF22-stock-levels.e2e.mts` | 2 |
| RF-23 | Filtrar las existencias | `RF23-stock-filters.e2e.mts` | 2 |
| RF-24 | Consultar el kardex de un producto | `RF24-kardex.e2e.mts` | 2 |
| RF-27 | Productos bajo el stock mínimo | `RF27-low-stock.e2e.mts` | 2 |
| RF-28 | Reporte de consumo | `RF28-consumption.e2e.mts` | 2 |

| Id | Escenario | Lo que verifica el código |
|---|---|---|
| RF19-01 | El borrador sobrevive a salir de la vista y a recargar, y es propio de su tipo | Línea y nota recuperadas tras ir a `/stock` y tras una carga en frío; la entrada empieza vacía |
| RF19-02 | Un borrador vacío no se confirma, Volver no lo pierde y Descartar sí lo borra | Sin barra Confirmar en vacío; tras Volver y recargar sigue la línea; tras Descartar no vuelve; el historial no cambia |
| RF22-01 | El listado de existencias muestra sus columnas y filas | Título, las cinco columnas, existencia y estado por fila; la IA lee la primera fila y se compara con el DOM |
| RF22-02 | Sin sesión, `/stock` redirige al login y no muestra existencias | Cierra sesión desde el menú de la cuenta; `/stock` acaba en `/login?next=%2Fstock` sin filas |
| RF23-01 | Buscar un producto y filtrar por su categoría acota el listado | Cada fila contiene todas las palabras buscadas (sin tildes, como la API); con la categoría, todas las filas son de ella |
| RF23-02 | Una búsqueda con comodín no devuelve nada y Limpiar filtros restaura el listado | `%` da *Ningún producto coincide…* (era DEF-01); Limpiar filtros vacía el buscador y repone las filas |
| RF24-01 | Abrir el kardex desde existencias y recorrer el saldo corrido | Título = producto; *En existencia* = el listado; cada saldo = saldo anterior + cambio |
| RF24-02 | El kardex de un producto inexistente avisa y deja volver a existencias | *Ese producto no está disponible.* y el enlace lleva a `/stock` |
| RF27-01 | La tarjeta Bajo mínimo lista los productos y lleva al kardex y a existencias | La IA lee la lista igual que el DOM; cada fila con existencia ≤ mínimo; enlaces al kardex y a `/stock` |
| RF27-02 | La lista no trae de más | La cifra del resumen ≥ la lista; cada producto listado tiene mínimo y está *Bajo mínimo* en `/stock` |
| RF28-01 | Cambiar el periodo y la agrupación actualiza resumen y ranking con cifras coherentes | *Año* cambia el rango; *Por categoría* da un ranking ordenado que no suma más que *Unidades despachadas* |
| RF28-02 | El periodo elegido se conserva al volver con el botón atrás (DEF-03) | **Se espera que falle** mientras exista DEF-03: el periodo no vive en la URL |

### Resultados reales (segunda parte)

**`22-rf19-rf28-completa`: 11 de 12 en una sola ejecución con el código actual** (9 min,
`qwen2.5` 7B, headless). El único fallo es RF28-02, que falla por DEF-03 como se esperaba:
al volver con el botón atrás el periodo marcado es *Mes* y no *Año*.

| Ejecución | Resultado | Qué pasó |
|---|---|---|
| `20-rf19-rf28` | 9 ✔ · 3 ✖ | RF28-02 por DEF-03. RF24-01 leyó *En existencia* mientras el kardex cargaba (la tarjeta pinta 0 hasta que llega la consulta); RF24-02 esperaba un `h1` que el aviso de producto no disponible no tiene. Los dos eran fallos de la prueba, no de la app |
| `21-rf24-validacion` | 2 ✔ | RF-24 tras esperar a que la tarjeta y las líneas carguen y abrir el producto inexistente sin `goto()` |
| `22-rf19-rf28-completa` | **11 ✔ · 1 ✖** | Completa. Solo falla RF28-02 (DEF-03) |

Diferencias con la primera parte:

- **Solo lectura.** Ninguno confirma ni anula movimientos: RF-19 guarda el borrador en
  `localStorage` y lo descarta. Por eso se ejecutó con el front y la API locales y la API
  apuntando a la base de Supabase, que tiene datos reales de bajo mínimo y consumo.
  `assertLocalStack()` sigue exigiendo `localhost` en las dos URLs.
- **RF22-02 cierra la sesión**, así que va último en su archivo.
- **DEF-01 ya está corregido** en la API (la búsqueda usa `strpos`, no `LIKE`): RF23-02
  verifica el comportamiento correcto.
- Helpers añadidos, sin cambiar los existentes: `headers`, `cells`, `tagRow`, `statTile`,
  `segmented` y `section` en `support/dom.mts`; `toNumber`, `stockTable`, `settledRows` y
  `fold` en `support/flows.mts`.

```powershell
npm run test:rf19   # rf19, rf22, rf23, rf24, rf27, rf28
$env:STAGEHAND_RUN = "20-rf19-rf28"; node scripts/run.mjs RF19 RF22 RF23 RF24 RF27 RF28
```

## Estructura

```text
tests/stagehand/
├── RF15-outbound.e2e.mts … RF28-consumption.e2e.mts   un archivo por requisito
├── support/
│   ├── env.mts            configuración por variables de entorno (.env de esta carpeta)
│   ├── ollama-client.mts  ClientLLM para Ollama (enfoque del profesor + ajustes medidos)
│   ├── session.mts        navegador local + Stagehand + login por IA
│   ├── ai.mts             act / observe / extract con registro y validación previa
│   ├── dom.mts            lecturas determinísticas del DOM (las aserciones)
│   ├── flows.mts          pasos compartidos (confirmar, existencias, historial…)
│   ├── suite.mts          arnés node:test: sesión por archivo, capturas, limpieza
│   ├── ledger.mts         anula por API los movimientos que creó cada escenario
│   ├── budget.mts         respeta el límite de 10 refresh/min de la API
│   ├── pdf.mts            valida el comprobante descargado
│   └── data.json          datos de prueba (bodegas, motivos, notas)
├── scripts/
│   ├── run.mjs            ejecuta la suite y genera reports/<ejecución>/
│   ├── check-model.mjs    prueba mínima de conexión con el modelo
│   ├── ollama-serve.ps1   arranca Ollama con el contexto y la memoria que necesita Stagehand
│   ├── scan-secrets.mjs   busca credenciales en reports/ antes de publicar
│   └── set-gemini-key.ps1 (opcional) guarda una clave de Gemini sin mostrarla
├── reports/               evidencia de cada ejecución (ver abajo)
├── .env.example           plantilla sin secretos; .env está ignorado por git
├── package.json           dependencias propias (no toca el package.json del repo)
└── tsconfig.json
```

## Cómo se usa la IA y qué verifica el código

Cada paso que un usuario haría lo resuelve **Stagehand con el modelo local**; cada
resultado lo comprueba **código determinístico** contra el DOM, el inventario o el
PDF. Una prueba nunca pasa porque la IA diga que la acción salió bien.

| Lo hace la IA (Stagehand + qwen2.5:7b) | Lo verifica el código |
|---|---|
| `observe` → validación → `act(acción)` para escribir correo, contraseña, nota, motivo y el código buscado (`ai.fill`) | Antes de escribir, que el nodo elegido sea el cuadro de texto con esa etiqueta; después, el valor que quedó en el campo |
| `observe` → validación → `act(acción)` para pulsar botones, enlaces, opciones y abrir selectores (`ai.click`, `ai.resolve`) | Antes de pulsar, que el elemento elegido tenga el nombre accesible esperado; después, el efecto (contador, diálogo, URL, aviso) |
| `observe` una vez y repetir la acción N veces sin inferencia (steppers hasta el tope) | Totales, "quedan N", botones deshabilitados y mensajes de tope |
| `extract` validado (`ai.extractChecked`): código del movimiento, existencias de las tarjetas, opciones de bodega, estado | Que lo extraído coincida con el DOM (título, tarjetas, lista, estado) |
| — | Existencias antes/después en `/stock`, historial, detalle, PDF (firma, código, tipo, estado) |

Si el modelo elige un elemento con otro nombre o lee un dato distinto del que
muestra la página, la acción **no se ejecuta** (o la lectura no se acepta): queda
registrada como `rechazo` en `ai-log.jsonl` y se le vuelve a preguntar indicando
el error, hasta 3 veces; al tercer error el escenario falla. El modelo elige el
elemento; la acción que se ejecuta es la del paso (clic en `ai.click`, rellenar
con el valor del escenario en `ai.fill`), y el valor viaja como variable de
Stagehand, así que el modelo nunca lo ve. El estado del movimiento se extrae con
un esquema limitado a las tres etiquetas que la app puede mostrar (`borrador`,
`confirmado`, `anulado`): como texto libre, el 7B respondía `confirmed`.

### Ajustes del adaptador de Ollama (medidos, no supuestos)

Stagehand 4.3.0 no trae proveedor `ollama/…`, así que, como en el proyecto del
profesor, el modelo es un `ClientLLM` que llama a `http://localhost:11434/v1/chat/completions`.
Con `qwen2.5:7b` aparecieron fallos reproducibles que se corrigieron en el
adaptador, cada uno con su evidencia en `reports/`:

1. **`action: null` siempre.** Con la rama `null` del esquema, la decodificación
   restringida de Ollama elegía `null` aunque el campo estaba en el árbol
   (`reports/02-rf15-act-null-qwen`, `reports/debug-login`). Se quita esa rama: el
   modelo debe nombrar un elemento y Stagehand solo actúa sobre ids que existen.
2. **Formato del id.** Ollama no aplica el `pattern` del esquema: el modelo devolvía
   la etiqueta, `[0-4]` o `2827`. Se añade una pista al prompt de sistema y se
   normaliza `[0-4]`→`0-4` y `2827`→`0-2827` (solo si es único en el árbol).
3. **Id del vecino.** Describía bien el elemento (`button: Añadir botella`) pero
   copiaba el id del texto contiguo (`reports/probe-card`). Si la descripción
   nombra una única línea del árbol, se usa el id de esa línea.
4. **Clic derecho.** Añadía `"left"`/`"right"` a los clics y "Confirmar" acababa
   en clic derecho (`reports/04-rf15`). Se descarta el botón del ratón.
5. **Selects de Radix.** Usaba `selectOptionFromDropdown` (solo sirve con `<select>`)
   y `twoStep`, que cerraba la lista recién abierta (`reports/05-rf15`). Sobre una
   `option:` se hace clic, y cada `act` es de un paso.
6. **`type` añade texto.** "ab" seguido de "    " quedaba "ab    "
   (`reports/08-rf18-rf20-rf21`). Sobre un textbox se usa `fill`.
7. **`press` en lugar de clic.** Eligió bien un botón pero con `press ["left"]`
   (la tecla flecha izquierda) y no pasó nada (`reports/10-…-INTERRUMPIDA-sin-memoria`).
   Sobre un botón, enlace u opción se hace clic.
8. **Descripción que repite la instrucción.** Respondía `"Pulsa el botón 'Añadir
   botella'"` en vez del nodo; el anclaje del punto 3 usa también el nombre entre
   comillas (`reports/11-…-DETENIDA-para-corregir`).

Y en la capa de la suite (`support/ai.mts`), no en el adaptador:

9. **Validación antes de actuar.** `ai.click`, `ai.fill` y `ai.resolve` comprueban en
   el DOM el elemento que eligió el modelo antes de ejecutar nada (`reports/13`:
   eligió el mensaje "Este campo no puede quedar vacío." como campo de texto).
10. **Lecturas validadas.** `ai.extractChecked` compara lo extraído con el DOM y
    vuelve a preguntar si no coincide (`reports/12`: leyó el estado como `"null"`).

Todas las correcciones aplicadas quedan escritas en `reports/<ejecución>/ollama.jsonl`
junto a la respuesta original del modelo.

## Requisitos

- Node.js ≥ 22.18 (probado con 24.22.1) y Google Chrome.
- **Ollama** para Windows (`winget install --id Ollama.Ollama -e`) y el modelo
  `ollama pull qwen2.5:7b` (≈4,7 GB). Probado con una RTX 3060 de 6 GB.
- El entorno **local y desechable** levantado: front en `:3000` apuntando a la API
  en `:3001`, Postgres en Docker y una segunda bodega "Barra E2E" (RF-17). La suite
  se niega a correr contra cualquier cosa que no sea `localhost`, porque confirma y
  anula movimientos.
- Una cuenta MANAGER del entorno local.

## Ejecutar

Desde `tests/stagehand/`:

```powershell
npm ci                                   # dependencias propias de esta carpeta
Copy-Item .env.example .env              # y completa TEST_USER_EMAIL / TEST_USER_PASSWORD
powershell -ExecutionPolicy Bypass -File scripts\ollama-serve.ps1   # Ollama con contexto de 16k
npm run check:model                      # Ollama responde y qwen2.5:7b devuelve JSON con esquema
npm test                                 # los 19 escenarios
npm run test:rf15                        # solo un requisito (rf15 … rf28)
$env:STAGEHAND_RUN = "19-mi-ejecucion"; npm test   # nombra la carpeta de evidencia
npm run typecheck
npm run scan:secrets                     # busca contraseñas, JWT, cookies y claves en reports/
```

`HEADLESS=false` (por defecto, como en el repositorio del profesor) muestra el
navegador; `HEADLESS=true` lo oculta.

**Por qué `ollama-serve.ps1`:** Ollama limita el contexto a 4096 tokens en GPUs de
menos de 24 GB, y Stagehand envía el árbol de accesibilidad de la página (≈8.000
tokens en las pantallas de captura). El script reinicia el servidor con
`OLLAMA_CONTEXT_LENGTH=16384` solo para ese proceso, sin tocar variables del sistema.

**Memoria.** Es el requisito más exigente. Al mismo tiempo corren Ollama con
`qwen2.5:7b` (~5,4 GB entre GPU y RAM con la configuración de `ollama-serve.ps1`,
~1,6 GB de eso en RAM con una GPU de 6 GB), un Chrome de Stagehand, `next dev`, la
API y Postgres en Docker. En un equipo de 16 GB con el navegador personal y VS Code
abiertos, la RAM libre bajó a 62–128 MB en las ejecuciones completas. Recomendado:
**16 GB de RAM con poco más abierto, o 24 GB**, y una GPU con 6 GB de VRAM o más.
`ollama-serve.ps1` arranca Ollama con caché de contexto cuantizada (`q8_0` + flash
attention) y sin peticiones paralelas para ahorrar memoria. `scripts/run.mjs`
vigila la RAM libre: por debajo de 300 MB durante 30 s deja una marca de parada
(el escenario en curso termina y anula sus movimientos; los siguientes fallan con
"Ejecución detenida…", nunca se omiten) y por debajo de 120 MB corta la ejecución.
`resumen.md` anota la RAM mínima y media. En el equipo de desarrollo hubo que
detener contenedores ajenos (Jenkins, MySQL, Mosquitto) y ejecutar con
`HEADLESS=true` para no quedarse sin memoria.

## Limitaciones pendientes

- **Falta una ejecución completa 19/19 con el código actual.** Es lo primero que
  hay que hacer en un equipo con más memoria: `npm test` con `HEADLESS=true`.
- **6 escenarios sin validar con el código actual** (ver "Resultados reales").
- **Cambios sin ejecutar** (posteriores a la última ejecución; solo comprobados con
  `npm run typecheck`):
  - se eliminó el método `Ai.act()` (instrucción en lenguaje natural), que ya no
    usaba ningún escenario;
  - la elección del producto de RF15-03/RF15-04 (`lowestStockProduct`) y de RF17-04
    usaba `reduce()` sin valor inicial: si ningún producto cumplía la condición
    (existencia > 0, o ≥ 12 en el origen) fallaba con un `TypeError` sin contexto.
    Ahora el escenario falla con una aserción que dice qué dato del entorno falta.
    Cuando hay candidatos se elige el mismo producto que antes, así que RF15-03,
    RF15-04 y RF17-04 cuentan como validados por las ejecuciones `18` y `15`, pero
    esta versión exacta no se ha ejecutado.
- **Modelo local pequeño.** `qwen2.5:7b` se equivoca a menudo (elige el nodo vecino,
  traduce, repite la instrucción). La suite lo compensa validando cada elección y
  repreguntando hasta 3 veces, así que un escenario falla si el modelo se equivoca
  tres veces seguidas en el mismo paso. Con temperatura 0 y parte del modelo en
  CPU, sus respuestas no son del todo deterministas.
- **Datos del entorno.** RF-17 necesita la bodega "Barra E2E"; RF-15 y RF-17 eligen
  productos según la existencia de la primera página del catálogo local.
- **Duración.** Una ejecución completa tarda unos 14 minutos con GPU.

Los archivos corren de uno en uno (`--test-concurrency=1`) y cada uno usa una sola
sesión: la API limita login y refresh a 10 por minuto por IP y rota los refresh
tokens con detección de reuso. No ejecutes otra suite contra el mismo entorno a la vez.

## Evidencias (`reports/<ejecución>/`)

| Archivo | Contenido |
|---|---|
| `resumen.md` | Resultado por escenario y por requisito, modelo, llamadas a la IA, tokens |
| `junit.xml` | Reporte JUnit de node:test |
| `salida.txt` | Salida de consola (con secretos enmascarados) |
| `ai-log.jsonl` | Cada `act`/`observe`/`extract`: instrucción, elemento elegido, tokens, rechazos |
| `ollama.jsonl` | Cada intercambio con Ollama: tamaño del prompt, respuesta cruda, correcciones |
| `escenarios.jsonl` | Estado, duración, error y movimientos creados por escenario |
| `metrics-*.json` | `stagehand.metrics()` por archivo |
| `screenshots/` | Captura final de cada escenario (`-ok` o `-FALLO`) |
| `comprobantes/` | PDFs descargados y validados en RF-21 |

Las variables se leen de `tests/stagehand/.env` (ignorado por git). Las contraseñas,
tokens y claves se enmascaran en todo lo que se escribe a `reports/`.
