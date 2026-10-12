# Pruebas E2E con Serenity/JS y el patrón Screenplay

Pruebas de extremo a extremo de las funcionalidades RF-19, RF-22, RF-23, RF-24, RF-27 y RF-28, más la autenticación como precondición. Corren sobre la aplicación real: un navegador Chromium manejado por Playwright, el front de Next en `:3000` y la API de verdad. Ninguna respuesta se simula.

La estructura sigue el proyecto de referencia `serenityjs-e2e-testing`: Cucumber con Gherkin para describir el comportamiento y Serenity/JS para implementarlo con Screenplay.

## El patrón, pieza por pieza

| Elemento del diagrama | Qué es aquí | Dónde vive |
|---|---|---|
| **Actor** | Camila, la encargada de bodega. Cada escenario la crea de nuevo con `actorCalled('Camila')` | `features/step-definitions/parameter.steps.ts` |
| **Abilities** | `BrowseTheWebWithPlaywright` (navegar), `CallAnApi` (hablar con la API sin navegador) y `TakeNotes` (recordar datos entre pasos) | `features/support/serenity.config.ts` |
| **Tasks** | Metas de negocio compuestas de acciones: `SignIn`, `GoTo`, `SearchStock`, `OpenKardex`, `CaptureOutbound`, `ChangeReport`, `UseTheApi` | `screenplay/tasks/` |
| **Actions (Interactions)** | Lo atómico. Las de Serenity (`Click`, `Enter`, `Navigate`, `Send`, `Wait`) y tres propias: `RespectTheLoginRateLimit`, la autenticación contra la API y las esperas de `Waits.ts` | `screenplay/tasks/` |
| **Questions** | Lo que el actor pregunta sobre el estado de la app: ruta actual, columnas, saldo del kardex, ranking, respuesta de la API… | `screenplay/questions/AppQuestions.ts` |
| **App** | Los elementos de pantalla como *lean page objects*: solo localizadores, sin lógica | `screenplay/ui/` |

Los steps no tienen selectores ni llamadas a Playwright: piden a la actriz que *intente* tareas (`actor.attemptsTo(...)`) y que *compruebe* respuestas a preguntas (`Ensure.that(pregunta, expectativa)`). Así se cumplen los dos principios que el patrón persigue:

- **Responsabilidad única (SRP).** Cada clase tiene un solo motivo para cambiar. Si cambia el HTML de la tabla de existencias, solo se toca `ui/StockPage.ts`. Si cambia el flujo de login, solo `tasks/SignIn.ts`. Los features no se enteran.
- **Abierto/cerrado.** Un escenario nuevo se arma combinando tareas y preguntas que ya existen, sin modificarlas. RF-27 es el ejemplo: suma la habilidad `CallAnApi` a la misma actriz y compara lo que ve en el panel con lo que responde la API, sin cambiar ninguna tarea web.

## Escenarios

| Feature | Escenario | Qué comprueba |
|---|---|---|
| Autenticación | Inicio de sesión correcto | Con la cuenta de `.env` se llega a `/dashboard` |
| Autenticación | Credenciales inválidas | Aparece el aviso de la API y no se sale de `/login` |
| RF-22 | Ver la tabla de existencias | Título, columnas, al menos un producto y el conteo «1–10 de N resultados» |
| RF-23 | Buscar por parte del nombre | Tras el debounce, todos los productos listados contienen el término |
| RF-23 | Búsqueda sin coincidencias | Aparece el aviso «Ningún producto coincide con esos filtros.» |
| RF-24 | Saldo del kardex | El kardex abierto es el del producto elegido y su saldo más reciente coincide con «En existencia» |
| RF-27 | Panel frente a API | La tarjeta «Bajo mínimo» lista los mismos productos, en el mismo orden, que `GET /stock/low?limit=8` |
| RF-28 | Ranking (3 ejemplos) | Para cada periodo y agrupación, el ranking va numerado 1, 2, 3… y las unidades de mayor a menor |
| RF-19 | Borrador tras recargar | Una salida capturada sin confirmar sobrevive a la recarga y se puede descartar |

Ningún escenario escribe en el ledger. El de RF-19 solo toca el `localStorage` del navegador de la prueba, que se descarta al terminar, y además descarta el borrador al final.

## Cómo correrlas

1. Instalar dependencias y el navegador, una sola vez:

   ```bash
   pnpm install
   pnpm exec playwright install chromium
   ```

2. En `.env`, la cuenta con la que entra la actriz (ver `.env.example`):

   ```
   TEST_USER_EMAIL="..."
   TEST_USER_PASSWORD="..."
   ```

3. Levantar el front contra la API de Render. Es la misma situación de `CLAUDE.md` §9: el front local apunta a la API desplegada. La variable del shell gana sobre `.env`, así que no hace falta editarlo:

   ```bash
   NEXT_PUBLIC_API_URL=https://beverage-ledger-api.onrender.com pnpm dev
   ```

4. En otra terminal, con la misma API para la habilidad `CallAnApi`:

   ```bash
   E2E_API_URL=https://beverage-ledger-api.onrender.com pnpm test:e2e
   ```

   En PowerShell, `$env:E2E_API_URL='https://beverage-ledger-api.onrender.com'; pnpm test:e2e`.

5. El informe HTML de Serenity queda en `reports/serenity-js/` y se abre con `pnpm test:e2e:report`.

Algunas variantes útiles:

```bash
pnpm test:e2e tests/e2e/features/rf-24-kardex.feature   # un solo feature
pnpm test:e2e --tags @rf-23                              # por etiqueta
pnpm test:e2e --name "Credenciales inválidas"            # por nombre
HEADLESS=false pnpm test:e2e                             # viendo el navegador
pnpm typecheck:e2e                                       # solo compilar la suite
```

## Decisiones que no se ven en el código

- **El ritmo de los inicios de sesión.** La API limita `/auth/login` y `/auth/refresh` a 10 peticiones por minuto por IP, y cada escenario abre un navegador nuevo que gasta un refresh al cargar y un login al entrar. `RespectTheLoginRateLimit` separa esos pares 7 segundos. Sin eso, la suite falla a la mitad con un 429 que parece una contraseña mala. Por eso una corrida completa tarda alrededor de un minuto y medio.
- **Se navega por el menú, no por URL.** Una navegación completa pierde el token que vive en memoria y obliga a comprar otro con la cookie de refresh, que además cuenta para el límite anterior. `GoTo` hace clic en el menú, como lo haría una persona. La única recarga deliberada es la de RF-19, porque eso es justo lo que el escenario prueba.
- **Visible frente a presente.** El `isVisible` de Serenity también exige que el elemento esté dentro del viewport. Lo que queda por debajo del pliegue (el selector de productos, la paginación) se espera con `WaitUntilPresent`, y `Click` se encarga de hacer scroll.
- **La contraseña no llega al informe.** En el navegador se escribe con `Masked.valueOf`. Contra la API el login no usa `Send`, que adjunta el cuerpo de la petición al informe, sino la habilidad `CallAnApi` directamente.
- **Mayúsculas por CSS.** Los encabezados de la tabla se ven en mayúsculas porque los transforma el CSS, y el texto que reporta el navegador sigue al CSS. La comparación de columnas ignora mayúsculas y minúsculas.
- **Dependencias de datos.** RF-23 busca «AMARO», que existe en el catálogo sembrado. RF-24 abre el primer producto de la lista, que tiene que tener al menos un movimiento confirmado para que exista una línea de kardex. Si el catálogo cambia, esos dos valores son lo primero que hay que revisar.

## Por qué no corre en CI

Necesita el front levantado y una cuenta real, así que no entra al `Jenkinsfile` ni a GitHub Actions. Vitest tampoco la ejecuta: sus archivos terminan en `.steps.ts`, no en `.test.ts`.
