# Pruebas Katalon Recorder (Selenium IDE HTML)

Diez casos de prueba de interfaz para Beverage Ledger, en el formato HTML clásico de Selenium IDE que importa **Katalon Recorder** (la extensión de Chrome/Firefox). No son un proyecto de Katalon Studio ni scripts Groovy.

Los casos se apoyan en los escenarios E2E de `tests/e2e/` (Serenity/JS + Screenplay) y en las pruebas E2E de la API (`beverage-ledger-api/test/e2e/`): los mismos flujos, los mismos textos y las mismas reglas de negocio, pero con selectores que Katalon Recorder entiende.

## Archivos

| Archivo | Qué comprueba | ¿Escribe en el ledger? |
|---|---|---|
| `TC01_Login_correcto_Manager.html` | Login con la cuenta Manager: llega a `/dashboard`, ve el menú, el panel «Registrar un movimiento» y el menú de la cuenta. Ve «Reportes» y **no** ve «Administración» (rol MANAGER) | No |
| `TC02_Login_incorrecto_Manager.html` | Mismo correo con una contraseña equivocada: aparece «Invalid email or password», sigue en `/login`, no hay menú y el correo escrito se conserva | No (ver «Bloqueo de cuenta») |
| `TC03_Confirmar_mensaje.html` | Captura una entrada sin confirmarla y la descarta: comprueba el texto del diálogo («¿Descartar lo que capturaste?» y su descripción) y la notificación «Borrador descartado» / «No se envió nada al ledger.» | No (solo `localStorage`) |
| `TC04_Encontrar_objeto.html` | Presencia y visibilidad de los elementos: campos y botón del login, menú principal, los cuatro accesos de registro, la tarjeta «Bajo mínimo» y los controles de la captura de ajuste (bodega, motivo, nota, fecha, búsqueda, botones `+`/`−`) | No |
| `TC05_RF15_Salida.html` | RF-15. Elige la bodega por defecto, añade una botella y comprueba que el selector la descuenta («N en existencia · quedan N-1»), el resumen y el diálogo de confirmación. **Rama de escritura:** confirma, comprueba «Salida · confirmado», la línea «1 botella» y el producto; verifica que la existencia bajó exactamente 1; anula y verifica que volvió al valor inicial | Solo en entorno aislado |
| `TC06_RF16_Entrada.html` | RF-16. Una entrada no tiene tope (no muestra existencias); dos botellas dan «1 producto · 2 unidades». **Escritura:** «Entrada · confirmado», «2 botellas», y se anula | Solo en entorno aislado |
| `TC07_RF17_Transferencia.html` | RF-17. Sin origen ni destino, «Confirmar» se anuncia no disponible (`aria-disabled`) y al pulsarlo pide «Un traspaso necesita un origen.» y «… un destino.». Con ambos elegidos, el destino no ofrece la bodega de origen y se abre la confirmación. **Escritura:** el detalle tiene «Líneas (2)» (las dos puntas) y se anula | Solo en entorno aislado |
| `TC08_RF18_Ajuste.html` | RF-18. Motivo vacío → «Un ajuste necesita un motivo antes de poder confirmarse.»; «abc» → «Al menos 4 caracteres.»; un motivo válido quita el aviso. **Escritura:** el dato «Motivo» del detalle es el escrito y se anula | Solo en entorno aislado |
| `TC09_RF20_Anulacion.html` | RF-20. **Escritura:** registra una entrada de 1 botella (la existencia sube 1), intenta anular sin motivo («Este campo no puede quedar vacío.» y «Falta un campo por revisar.»), «Conservarlo» la deja confirmada, la anula con motivo y comprueba «anulado», «Anulado el», que ya no hay botón «Anular», que el código no cambió y que la existencia volvió. **Sin escritura:** filtra el historial por «confirmado», abre uno, prueba la anulación sin motivo y pulsa «Conservarlo»; nada se anula | Solo en entorno aislado |
| `TC10_RF21_Comprobante.html` | RF-21. Descarga el PDF desde el detalle y desde la tarjeta del historial: el archivo se llama `<código>.pdf`, es `application/pdf` y empieza por `%PDF-`; no aparece «No se pudo descargar el PDF» | No |
| `Suite_Beverage_Ledger.html` | Los diez casos anteriores en un solo archivo, uno por tabla | Igual que cada caso |

`login.html` y `e2e-tomas.html` ya estaban en la carpeta y no se modificaron (usan otra cuenta).

## Variables de cada caso

Las primeras filas de cada caso son de configuración:

| Variable | Valor por defecto | Para qué |
|---|---|---|
| `BASE_URL` | `https://beverage-ledger.vercel.app` | Dónde corre el front. Para el entorno aislado, `http://localhost:3000` |
| `USER_EMAIL` | `Manager@test.com` | Cuenta de pruebas con rol MANAGER |
| `USER_PASSWORD` | `SecurePass123!` | Su contraseña |
| `ESCRITURA_AISLADA` | `NO` | Solo en TC05–TC09. `SI` habilita la rama que confirma y anula movimientos |

### Protección contra escrituras en producción

TC05–TC09 tienen dos ramas. La que escribe solo corre si **las dos** condiciones se cumplen:

```text
gotoIf | '${ESCRITURA_AISLADA}' != 'SI' || '${BASE_URL}'.indexOf('beverage-ledger.vercel.app') != -1 | SIN_ESCRITURA
```

- Con los valores por defecto (`NO` + Vercel) se ejecuta la **rama sin escritura**: se valida todo hasta el diálogo de confirmación, se pulsa «Volver», se comprueba que el borrador sigue intacto y se descarta. No se envía nada a la API.
- Contra `beverage-ledger.vercel.app` la escritura queda **bloqueada aunque se ponga `SI`**.
- Con `SI` y un front aislado (por ejemplo `http://localhost:3000` contra una base desechable) se ejecuta la **rama de escritura**. Cada movimiento que se registra se anula al final, así que las existencias quedan como estaban. Aun así, los movimientos anulados se quedan en el historial, porque el ledger es inmutable.

El caso deja en el log un `echo` que dice qué rama tomó.

## Cómo importar en Katalon Recorder

1. Instala Katalon Recorder en Chrome o Firefox y ábrelo desde su icono.
2. Para la suite completa: **Open** (icono de carpeta junto a «Test Suites») → `Suite_Beverage_Ledger.html`. Aparece la suite «Suite Beverage Ledger» con los diez casos (una tabla = un caso).
3. Para un caso suelto: **Open** → `TCxx_….html`. Se importa como una suite de un solo caso.
4. Antes de correr TC05–TC09 contra un entorno aislado, cambia en sus primeras filas `BASE_URL` y `ESCRITURA_AISLADA` (o búscalos y reemplázalos en los archivos antes de importarlos).

## Cómo ejecutar

- **Un caso:** selecciónalo en el panel izquierdo y pulsa **Play** (ejecutar el caso actual).
- **La suite:** selecciona la suite y pulsa **Play Suite**. Cada caso empieza con `pause 7000` por el límite de la API (ver abajo), así que la suite completa tarda unos 5 minutos.
- **Todas las suites abiertas:** **Play All**.
- El resultado de cada paso queda en la pestaña **Log**. Los `echo` dicen qué producto, qué código de movimiento y qué rama se usaron.
- Ejecuta con la ventana del navegador en tamaño de escritorio (≥ 640 px de ancho): en pantallas de móvil el panel «Registrar un movimiento» se oculta y se usa un botón flotante.

### Entorno aislado (para la rama de escritura)

Igual que el stack local de `tests/e2e/README.md`, todo con variables de shell y sin `.env`:

1. API (`beverage-ledger-api`): `docker compose up -d db`; con `DATABASE_URL`/`DIRECT_URL` en `postgresql://postgres:postgres@localhost:5434/beverage_ledger` corre `pnpm exec prisma migrate deploy` y el seed `SEED_MODE=demo`; luego `pnpm build` y `node dist/main` con `JWT_SECRET` (32+ caracteres).
2. Crea **una segunda bodega** (TC07 la necesita como destino) y la cuenta `Manager@test.com` con rol MANAGER (invitación desde Administración → Usuarios con la cuenta admin, o `POST /api/v1/invitations` + `POST /api/v1/invitations/accept`).
3. Front: `NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev`.
4. En Katalon Recorder: `BASE_URL = http://localhost:3000` y `ESCRITURA_AISLADA = SI`.

## Decisiones técnicas

- **Inputs de React.** Los campos se llenan con `runScript` y el setter nativo de `HTMLInputElement` más un evento `input`, porque `type` no actualiza el estado de React. Cada script va envuelto en `(function () { … })();`: `runScript` inyecta una etiqueta `<script>`, y dos scripts con `const set` en el ámbito global chocan («Identifier 'set' has already been declared»), así que el segundo no se ejecuta.
- **Hidratación del login.** Si el valor se escribe antes de que React tome el formulario, se pierde. Antes de llenar el login, un `runScript` espera a que React esté enganchado al input y marca `body@data-kr-hydrated`; el caso espera esa marca con `waitForAttribute`.
- **Selects de Radix.** Los selectores de bodega y de estado son `button[role=combobox]`; un `click` normal los abre y elige una opción. Se espera a que el botón deje de estar `disabled` (mientras cargan las bodegas dice «Cargando…») y a que la lista se cierre (`[role=listbox]` desaparece) antes de abrir el siguiente.
- **Comprobaciones numéricas.** Katalon Recorder no tiene aritmética, así que un `runScript` calcula la diferencia entre dos textos guardados con `storeText` («N en existencia · quedan M») y la deja en `body@data-kr-delta`, que se comprueba con `verifyAttribute`.
- **Comprobante PDF.** La app genera un blob y hace clic en un enlace oculto, y Katalon Recorder no puede leer archivos descargados. Un `runScript` envuelve `URL.createObjectURL` y `HTMLAnchorElement.click` para dejar en `body@data-kr-pdf-*` el nombre, el tipo y los primeros 5 bytes de lo que recibió el navegador. La descarga sigue ocurriendo normalmente.
- **Navegación por menú.** Tras el login se navega haciendo clic en el menú, no con `open`: una carga completa pierde el token en memoria y gasta un refresh, que cuenta para el límite de la API.

## Limitaciones y precauciones

- **Credenciales en texto plano.** El formato HTML de Selenium IDE no tiene secretos: la contraseña está en la fila `store … USER_PASSWORD` de cada archivo y aparece en el log de Katalon Recorder. Usa solo la cuenta de pruebas, no reutilices esa contraseña en otra cuenta, no compartas capturas del panel con esas filas visibles y, si el repositorio se hace público, rota la contraseña o reemplaza el valor por un marcador antes de publicarlo.
- **Límite de inicios de sesión.** La API acepta 10 login/refresh por minuto por IP. Por eso cada caso empieza con `pause 7000`. Si un caso falla con un aviso que no es «Invalid email or password» justo tras muchos intentos, es un 429: espera un minuto.
- **Bloqueo de cuenta (TC02).** Cada contraseña errónea suma un intento fallido a `Manager@test.com`. Con 5 seguidos la cuenta se bloquea 15 minutos (valores por defecto de la API). Un login correcto reinicia el contador, y en la suite TC01 y TC03 lo hacen, pero no ejecutes TC02 solo más de cuatro veces seguidas.
- **Datos.** TC07 (rama de escritura) necesita al menos dos bodegas. TC05 y TC07 necesitan algún producto con existencias en la bodega por defecto. TC09 sin escritura necesita al menos un movimiento confirmado, y TC10 al menos un movimiento en el historial. Si el catálogo o el historial están vacíos, esos casos fallan en la espera correspondiente.
- **Comandos de control de flujo.** `gotoIf`, `label`, `gotoLabel` y `echo` forman parte del set de comandos de Katalon Recorder. Si tu versión no los tuviera, la rama sin escritura no se puede elegir. En ese caso ejecuta TC05–TC09 solo contra el entorno aislado.
