# Historial de ejecuciones

Cada carpeta conserva la evidencia de una ejecución real, en orden cronológico
(25 de octubre de 2026, entorno local). Nada se sobrescribe: la ejecución vigente
está en `reports/` y, una vez archivada, también aquí.

| Carpeta | Qué se ejecutó | Resultado | Evidencia |
|---|---|---|---|
| `01-baseline-rf15-rf16/` | RF-15 y RF-16 recién generados, con el Planner corriendo a la vez | 2 ✓ · 5 ✘ | junit, json |
| `02-completa-tras-generator/` | Las 19 pruebas recién generadas | 11 ✓ · 8 ✘ (sesión perdida por 429) | junit, json |
| `03-tras-arreglar-throttle/` | Tras añadir el presupuesto de `/auth/refresh` | 18 ✓ · 1 ✘ | junit, json |
| `04-independientes/RF15-outbound/` | Solo RF-15 | 5 ✓ | junit, json, salida |
| `04-independientes/RF16-inbound/` | Solo RF-16 | 2 ✓ | junit, json, salida |
| `04-independientes/RF17-transfer/` | Solo RF-17 | 4 ✓ | junit, json, salida |
| `04-independientes/RF18-adjustment/` | Solo RF-18 | 2 ✓ | junit, json, salida |
| `04-independientes/RF20-cancellation/` | Solo RF-20 | 3 ✓ | junit, json, salida |
| `04-independientes/RF21-receipt/` | Solo RF-21 | 3 ✓ | junit, json, salida |
| `05-completa-19de19-powershell/` | Las 19, desde PowerShell, tras los últimos ajustes del código | 19 ✓ | junit, json, salida, capturas, trazas |
| `06-tras-reorganizacion/` | Las 19, desde PowerShell, tras mover los archivos a esta estructura | 19 ✓ | junit, json, salida, HTML (con trazas), capturas |
| `07-tras-mover-a-tests/` | Las 19, desde PowerShell, tras mover la carpeta de `IA/` a `tests/IA/` | 19 ✓ | junit, json, salida, HTML (con trazas), capturas |
| `09-ui-actual-sin-adaptar/` | 26/10: la suite de `07` contra la interfaz del 24/10 | 0 ✓ · 19 ✘ (login) | junit, salida |
| `10-login-adaptado-a-mano/` | 26/10: con `signIn()` adaptado a mano | 12 ✓ · 7 ✘ | junit, salida |
| `11-colision-con-copilot/` | 26/10: tras el Healer, pero a la vez que la suite de Copilot | 13 ✓ · 6 ✘ (429 por el límite compartido) | junit, salida |
| `12-healer-ui-actual/` | 26/10: última `test_run` del Healer tras reparar las 7 | 20 ✓ (19 + seed) | salida de la herramienta |

Notas:

- `08-sin-credenciales/` (19 errores por faltar `TEST_USER_*`) y el HTML de cada
  ejecución quedan solo en local: el HTML registra la contraseña de los pasos `fill`.

- El HTML de `05` se perdió: el comando `--list` lo reescribió vacío (Playwright
  ejecuta los reporters configurados incluso al listar). Queda como
  `html-VACIO-sobrescrito-por-list/` para dejar constancia. Desde entonces la config
  no usa reporters de archivo con `--list`.
- Antes de `05` hubo otra ejecución completa 19/19 desde PowerShell. Su junit se
  reemplazó por el de `05` al repetirla tras corregir los tipos de `RF21-receipt.spec.ts`.
- `05/artifacts/` contiene un `trace.zip` y capturas por prueba:
  `npx playwright show-trace <carpeta>/artifacts/<prueba>/trace.zip`. En `06` y `07`
  se borró `artifacts/` (26/10/2026): sus 41 archivos estaban, byte a byte, dentro de
  `html/data/`, y se ven con `npx playwright show-report <carpeta>/html`.
- `07` era una copia de la ejecución vigente. Desde el 26/10/2026 la ejecución vigente
  vive solo en `reports/` y no se copia aquí.
