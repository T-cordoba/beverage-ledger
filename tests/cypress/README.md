# Cypress — E2E y pruebas visuales

Suite Cucumber/Cypress en `tests/cypress/`, corre contra el front **desplegado**
(`https://beverage-ledger.vercel.app`, ver `cypress.config.ts`), nunca contra un
`pnpm dev` local.

## Setup

El binario de Cypress no se instala solo: `pnpm-workspace.yaml` lo tiene en
`ignoredBuiltDependencies` (ver `CLAUDE.md` §3), así que su `postinstall` nunca
corre. Después de `pnpm install`:

```bash
pnpm exec cypress install
```

```bash
pnpm test:cypress         # toda la suite
pnpm test:cypress:open    # modo interactivo
pnpm test:visual          # solo los escenarios @visual (Applitools Eyes)
```

`TEST_USER_EMAIL` y `TEST_USER_PASSWORD` en `.env` (login real). `test:visual`
además necesita `APPLITOOLS_API_KEY`.

## Pruebas visuales (Applitools Eyes)

`@applitools/eyes-cypress` envuelve `cypress.config.ts`. Los escenarios tagueados
`@visual` (uno por RF-19/22/23/24/27/28) abren una sesión de Eyes en el `Before`
de `common.steps.ts` y hacen un `cy.eyesCheckWindow()` en su aserción final. El
flag `visualCheck.open` (`support/scenario.ts`) evita que un step compartido con
un escenario sin ese tag llame `eyesCheckWindow` sin sesión abierta.

Resultados en eyes.applitools.com → batch **"Beverage Ledger — existencias e
integridad de datos"**.

**Esbuild no stubea los built-ins de Node.** A diferencia de webpack, `esbuild`
(el bundler de specs de este repo) no stubea automáticamente módulos como
`stream` para un bundle de navegador. `@applitools/eyes-cypress/commands` arrastra
el SDK completo de `@applitools/eyes`, que los requiere de forma estática aunque
el código que realmente corre en el navegador no los use. Por eso
`cypress.config.ts` trae un plugin `stubNodeBuiltinsPlugin` que los reemplaza por
un módulo vacío al bundlear.

## Bug conocido: RF-24 nunca va a pasar mientras esta rama no se despliegue

**2026-10-26.** El step `el saldo más reciente coincide con lo que hay en
existencia` (`existencias.steps.ts`) busca el texto `Movimientos confirmados
de {product}` en el `<caption>` del kardex. Ese texto es el renombre del commit
`4c5021e` ("say movement history instead of ledger"), que vive en esta rama
(`ci/jenkins-pipeline`) y **todavía no está desplegado**: `beverage-ledger.vercel.app`
sigue sirviendo el string anterior, `Líneas confirmadas del ledger de {product}`
(confirmado leyendo el HTML servido en producción para un producto real).

No es un problema de qué producto elige "el primer producto listado" —se
investigó esa hipótesis primero y no era—, ni de timing: el string nuevo
simplemente no existe todavía en lo que Cypress visita. El step va a fallar
siempre, con cualquier producto, hasta que esta rama (o al menos ese commit)
se despliegue.

**No se tocó el step para no desincronizarlo más** cuando el despliegue pase: ya
va a decir lo correcto en cuanto el commit llegue a producción. Si hace falta
correr RF-24 antes de eso, apuntar `baseUrl` en `cypress.config.ts` a un preview
deploy de esta rama en vez de tocar el string esperado.
