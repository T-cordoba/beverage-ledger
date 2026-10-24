# Pruebas E2E con Cypress y Gherkin

Los mismos siete casos de `tests/katalon/e2e-tomas.html`, escritos en Gherkin y ejecutados con Cypress mediante [`@badeball/cypress-cucumber-preprocessor`](https://github.com/badeball/cypress-cucumber-preprocessor). Corren contra el despliegue real, `https://beverage-ledger.vercel.app`, igual que Katalon, y ninguno escribe en el ledger: RF-19 solo toca el `localStorage` del navegador de la prueba y descarta el borrador al final.

| Feature | Escenario | Caso de Katalon |
|---|---|---|
| `rf-22-existencias` | Ver la tabla de existencias | RF-22 Ver existencias |
| `rf-23-filtrar-existencias` | Buscar por parte del nombre | RF-23 Filtrar |
| `rf-23-filtrar-existencias` | Búsqueda sin coincidencias | RF-23 Sin coincidencias |
| `rf-24-kardex` | El saldo del kardex coincide con la existencia | RF-24 Kardex |
| `rf-27-bajo-minimo` | El panel muestra la tarjeta de bajo mínimo | RF-27 Bajo minimo |
| `rf-28-reporte-consumo` | Ranking anual por categoría | RF-28 Reporte |
| `rf-19-borrador` | El borrador sobrevive a una recarga y se puede descartar | RF-19 Borrador |

## Estructura

```
cypress.config.ts            baseUrl, preprocessor de Cucumber y la espera entre logins
tests/cypress/
  features/                  los .feature, uno por requisito
  step-definitions/          los pasos: common (login, navegación) · existencias · panel · borrador
  support/e2e.ts             el único manejador global (ver «Hallazgo» abajo)
```

La configuración del preprocessor vive en la clave `cypress-cucumber-preprocessor` del `package.json`: dónde están los pasos y dónde se escribe el reporte.

Respecto a Katalon cambian tres cosas: no hay pausas fijas, porque las aserciones de Cypress reintentan hasta que se cumple la condición; RF-23 comprueba que **todos** los productos listados contienen el término, no solo el primero; y la contraseña ya no está en el caso, sino que sale del `.env`.

## Cómo correrlas

1. Una sola vez, descargar el runner de Cypress. pnpm no deja correr scripts de instalación (ver `pnpm-workspace.yaml`), así que esta descarga no pasa sola:

   ```bash
   pnpm exec cypress install
   ```

2. En `.env`, la cuenta con la que se entra: `TEST_USER_EMAIL` y `TEST_USER_PASSWORD`.

3. Ejecutar:

   ```bash
   pnpm test:cypress        # headless, todas las features
   pnpm test:cypress:open   # interfaz interactiva
   pnpm typecheck:cypress   # tipos de los pasos
   ```

El reporte HTML de Cucumber queda en `reports/cypress/cucumber-report.html`, y las capturas de los escenarios fallidos en `reports/cypress/screenshots/`.

## Límite de la API

La API acepta 10 peticiones por minuto a `/auth/login` y otras 10 a `/auth/refresh`. Cada escenario inicia sesión, así que `cypress.config.ts` separa los logins por 7 s. Si encadenas dos corridas completas sin dejar un minuto entre ellas, el `refresh` que hace RF-19 al recargar puede responder 429 y la prueba cae a `/login`. Eso es el límite de la API, no un fallo de la funcionalidad.

## Hallazgo: React #418 en producción

De forma intermitente, la app desplegada lanza `Minified React error #418`, un desajuste de hidratación: el HTML del servidor no coincide con el primer render del cliente. React se recupera renderizando en el cliente y la página funciona, pero Cypress falla cualquier escenario ante una excepción no capturada. `support/e2e.ts` deja pasar **solo** ese error; cualquier otro sigue haciendo fallar la prueba. Katalon y Playwright no lo detectaban porque no escuchan las excepciones de la página.
