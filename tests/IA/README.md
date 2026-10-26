# IA — Herramientas de prueba asistidas por inteligencia artificial

Esta carpeta reúne la evaluación de tres herramientas de IA para automatizar las
pruebas E2E del frontend de Beverage Ledger sobre las mismas seis funcionalidades.
Vive en `tests/IA/`, junto a las demás suites del front. Cada herramienta tiene su
propia subcarpeta y no comparte archivos con las otras ni con esas suites (Vitest en
`tests/*.test.ts`, Cypress en `tests/cypress`, Serenity/JS y Cucumber en `tests/e2e`,
Katalon en `tests/katalon`).

| # | Herramienta | Carpeta | Estado |
|---|---|---|---|
| 1 | **Playwright Test Agents** (Planner, Generator, Healer con Claude Code) | [`Playwright-Test-Agents/`](Playwright-Test-Agents/README.md) | ✅ Implementada y ejecutada: 19/19 pruebas aprobadas |
| 2 | **Cypress Cloud + Studio AI** (`cy.prompt`, proyecto Cloud `q79b5v`) | [`Cypress-Studio-AI/`](Cypress-Studio-AI/README.md) | ✅ Implementada y ejecutada: 19/19 pruebas aprobadas (Chrome, 2026-10-26) |
| 3 | **Playwright MCP + GitHub Copilot** (Copilot en modo agente explora la app con `@playwright/mcp` y escribe las pruebas) | [`Playwright-MCP-Copilot/`](Playwright-MCP-Copilot/README.md) | ✅ Implementada y ejecutada: 19/19 pruebas aprobadas (2026-10-26) |

## Funcionalidades evaluadas

Las tres herramientas cubren las mismas funcionalidades, para poder comparar resultados:

| Requisito | Funcionalidad | Ruta en la app |
|---|---|---|
| RF-15 | Salida de inventario (OUTBOUND) | `/movements/new/outbound` |
| RF-16 | Entrada de inventario (INBOUND) | `/movements/new/inbound` |
| RF-17 | Traspaso entre bodegas (TRANSFER) | `/movements/new/transfer` |
| RF-18 | Ajuste de inventario (ADJUSTMENT) | `/movements/new/adjustment` |
| RF-20 | Anulación de movimientos | `/movements/{id}` |
| RF-21 | Descarga del comprobante PDF | `/movements` y `/movements/{id}` |

## Reglas comunes

- Las pruebas que escriben en el ledger solo corren contra un entorno **local y
  desechable** (front `:3000`, API `:3001`, Postgres en Docker). Nunca contra
  producción (Vercel/Render).
- Las credenciales se pasan por variables de entorno de la shell (o por
  `Cypress-Studio-AI/.env` y `Playwright-MCP-Copilot/.env`, ignorados por git); nunca se
  guardan en archivos versionados.
- La API limita `/auth/login` y `/auth/refresh` a 10 peticiones por minuto por IP:
  no ejecutes dos herramientas a la vez contra el mismo entorno.
- Los resultados se documentan solo con ejecuciones reales; lo bloqueado o pendiente
  se declara como tal.
