Genera las pruebas de la sección "1. RF-15 Salida" del plan `planner/beverage-ledger-movimientos.plan.md`, una por escenario, en el archivo `.pw.ts` que indica cada escenario (todos dentro de `generator/`). Seed: `generator/seed.pw.ts`. Hazlo escenario por escenario: generator_setup_page, ejecuta los pasos en el navegador, generator_read_log, generator_write_test.

Convenciones obligatorias del código que escribes (léelas en `generator/support/fixtures.ts` y `generator/support/env.ts`):
- Importa SIEMPRE así: `import { expect, test } from './support/fixtures';` (nunca directamente de '@playwright/test'). El fixture `page` ya trae la sesión MANAGER iniciada y limpia localStorage al terminar.
- Los escenarios de autenticación que necesitan estar SIN sesión usan el fixture `guestPage` (o `context`), nunca `page`. Haz como mucho 1 login real por archivo y usa `signIn(page, email, password)` exportado de './support/fixtures' con `MANAGER` de './support/env'. Para el login incorrecto usa un correo inexistente.
- Escenarios marcados [ESCRIBE EN EL LEDGER]: primera línea del test `test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);` (importados de './support/env'), y en cuanto la URL sea /movements/<id> llama `ledger.track(id)` (fixture `ledger`). Si el escenario no anula el movimiento él mismo, el teardown lo anula.
- Selectores: getByRole / getByLabel / getByText con los nombres accesibles reales en español. Nada de CSS por clases de Tailwind, nada de `page.waitForTimeout`, nada de índices frágiles salvo `.first()` sobre una lista ya filtrada. Las esperas son las aserciones web-first de `expect`.
- Selects de bodega: son Radix (`getByRole('combobox', { name: 'Desde' })` → `getByRole('option', { name: ... })`). Ojo: el trigger está deshabilitado ("Cargando…") hasta que cargan las bodegas.
- Toasts: `getByText('Movimiento registrado')`. Descargas: `const download = page.waitForEvent('download')` antes del click, y valida `download.suggestedFilename()` con /^MOV-\d{4}-\d+\.pdf$/.
- No uses productos concretos por nombre si su existencia puede cambiar: toma el primer producto con 'Añadir botella' habilitado o búscalo con el buscador del selector. Para tope de existencia busca uno con poca existencia en el momento.
- Títulos de describe y test en español, igual que en el plan.
- No modifiques `generator/support/*`, `generator/seed.pw.ts` ni `playwright.config.ts`.
- Si el archivo de un escenario ya existe en `generator/`, sáltalo: no lo regeneres.
