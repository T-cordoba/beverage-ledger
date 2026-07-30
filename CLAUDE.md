# CLAUDE.md — Beverage Ledger (Frontend)

Contexto para agentes que trabajen en este repositorio.

---

## 1. Qué es esto

**Beverage Ledger** es un sistema de gestión de inventario de licores para operaciones de hostelería (bares, casinos, restaurantes). El usuario registra movimientos de producto —salidas de bodega a barra, entradas de proveedor, ajustes por merma— y el sistema mantiene las existencias, el historial auditable y los reportes de consumo.

El nombre no es casual: la fuente de verdad del inventario es un **ledger inmutable** de líneas de movimiento. Las existencias son una proyección derivada de ese ledger, nunca un número que se edita a mano.

**Este repositorio es únicamente el frontend.** La API vive en un repo separado.

| | Repositorio | Stack |
|---|---|---|
| Frontend | `beverage-ledger` (este) → `C:\VisualProjects\beverage-ledger` | Next.js 15 (App Router), TypeScript, Tailwind |
| Backend | [`beverage-ledger-api`](https://github.com/T-cordoba/beverage-ledger-api) → `C:\VisualProjects\beverage-ledger-api` | NestJS, Prisma, Supabase Postgres |

---

## 2. Estado: migración en curso

⚠️ **Importante para cualquier agente que edite este repo.** El proyecto está en medio de una reescritura arquitectónica en fases. El código que existe hoy **no** refleja la arquitectura objetivo. Antes de tocar algo, ubica en qué fase estamos:

| Fase | Qué incluye | Estado |
|---|---|---|
| 0 | Higiene del repo front: ESLint, Prettier, alias `@/`, código muerto, `CLAUDE.md` | ✅ Hecha |
| 1 | Repo API: scaffold Nest, Prisma, esquema, seed, `common/` | ✅ Hecha |
| 2 | API: auth (local + Google OAuth), JWT, refresh, matriz de permisos | ✅ Hecha |
| 3 | API: catálogo, inventario con stock, reportes, PDF | ✅ Hecha |
| 4 | Front: design system (tokens CSS, primitivos Radix, `cn()`) | ✅ Hecha |
| 5 | Front: reestructura a rutas reales + corte a la API nueva | 🔄 Siguiente |
| 6 | Front: dashboard de existencias + panel de administración | ⬜ Pendiente |
| 7 | Front: landing page + i18n + parametrización de branding | ⬜ Pendiente |
| 8 | READMEs y documentación final | ⬜ Pendiente |

Plan completo: `C:\Users\Tomas\.claude\plans\ok-voy-a-hacerle-tender-sprout.md`

**El backend está terminado.** Las fases 1 a 3 ocurrieron enteras en `beverage-ledger-api`; a partir de aquí todo el trabajo es de este repositorio.

**Hasta la Fase 5, la app sigue funcionando contra la base de datos Neon vieja.** No borres `src/app/actions.ts`, `src/app/actions-licores.ts` ni `src/app/api/` antes del corte — la app deja de funcionar. La base nueva de Supabase ya existe y está sembrada, pero todavía no la consume nadie.

---

## 3. Comandos

**El gestor de paquetes es pnpm**, fijado en `packageManager` del `package.json`. No uses `npm install` en este repo: generaría un `package-lock.json` paralelo y te saltarías la configuración de seguridad de abajo.

```bash
pnpm install                    # instalar dependencias
pnpm install --frozen-lockfile  # lo que hace CI: falla si el lockfile no cuadra
pnpm dev                        # servidor de desarrollo (Turbopack) en :3000
pnpm build                      # build de producción
pnpm start                      # servir el build
pnpm lint                       # ESLint
pnpm typecheck                  # tsc --noEmit
pnpm format                     # Prettier --write
```

### Por qué pnpm, y qué protege de verdad

pnpm instala **del mismo registro que npm**: no te salva de que un paquete publique una versión comprometida. Lo que aporta son tres cosas concretas, configuradas en `pnpm-workspace.yaml`:

- **Ningún paquete puede correr scripts de instalación.** `onlyBuiltDependencies` está vacío. Ese es el vector que usó el gusano Shai-Hulud en 2025, y en npm los `postinstall` corren todos sin preguntar. `sharp` y `unrs-resolver` piden uno, pero traen binarios precompilados como dependencias opcionales y su script es solo un fallback de compilación: lint, typecheck y build pasan sin él. Están en `ignoredBuiltDependencies` para dejar constancia de que la decisión es deliberada. (pnpm 10.32 sigue avisando en cada install de todos modos; es cosmético.)
- **Cuarentena de 24h** (`minimumReleaseAge: 1440`). Una versión maliciosa se detecta y despublica en horas, así que nunca llegaría aquí. Solo afecta a resolver dependencias nuevas o subidas de versión, no a instalar desde el lockfile. Si necesitas un paquete recién publicado, `pnpm add --minimum-release-age 0 <pkg>`, a conciencia.
- **`node_modules` estricto**: un paquete solo ve lo que declara. Es el fallo que se arregló en la Fase 0, cuando `react` y `react-dom` llegaban solo transitivamente vía `next`; ahora ese error no puede volver a colarse.

### Avisos de seguridad: qué está arreglado y qué no

Los avisos de las dependencias transitivas se cierran con **`overrides` en `pnpm-workspace.yaml`**, que es la forma de parchear algo que upstream todavía no ha subido. Se pasó de 31 avisos a **2**.

**No los escribas con `pnpm audit --fix`.** Genera una entrada por aviso: selectores solapados y, lo importante, reemplazos tipo `'>=1.1.16'` que pnpm resuelve a la versión más alta del registro y **cruzan de major en silencio**. Los overrides de este repo están escritos a mano, uno por línea de major y con `^`, para que un parche no se convierta en un salto de versión mayor.

**Nunca corras `audit fix --force`.** Propone instalar `next@9.3.3`, o sea bajar de la 15 a una versión de 2020.

**Los 2 avisos que quedan abiertos son deliberados.** Son el mismo, GHSA-mh99-v99m-4gvg de `brace-expansion`, que solo está marcado como corregido en `>=5.0.8`. En la 5.x el export de CommonJS pasó a ser un objeto namespace (`{ EXPANSION_MAX, EXPANSION_MAX_LENGTH, expand }`), y `minimatch` hace `require(...)` y lo llama como función: forzarlo hace que **minimatch 3 y 9 lancen en cualquier patrón con llaves** — comprobado. Y lo peor es que `eslint` sigue saliendo limpio, así que no se notaría hasta que un patrón con llaves pasara por ahí. Se espera a que `minimatch` suba de versión.

El riesgo residual es aceptable: es un DoS por expansión de llaves en *tooling de desarrollo*, con patrones que salen de nuestra propia config de ESLint, no de una entrada de usuario. Nada de esto es alcanzable desde la app desplegada.

Variables de entorno: copia `.env.example` a `.env`. **Nunca** commitees `.env` ni pegues credenciales en archivos versionados (incluido este).

---

## 4. Decisiones de arquitectura (y su porqué)

Estas decisiones ya están tomadas. No las revisites sin hablarlo con el usuario.

**Front y back en repos separados.** El backend es un servicio propio, no un detalle de implementación de Next. Debe poder servir a otros clientes (móvil, integraciones) sin arrastrar el framework de front.

**Contrato vía OpenAPI generado, no tipos escritos a mano.** Nest genera el OpenAPI desde sus DTOs; el front corre `pnpm api:types` y regenera `src/lib/api/schema.d.ts` con `openapi-typescript`. Motivo: el código original tenía **cuatro declaraciones distintas** del tipo `Licor` que se desincronizaban en silencio. Con el contrato generado, un cambio en la API rompe la compilación del front en vez de romper producción.

**Prisma sobre Supabase Postgres.** El problema más grave del código original era que el esquema **no existía en el repositorio** — ni un `CREATE TABLE`, solo la instancia viva. Prisma pone el esquema y las migraciones bajo control de versiones.

**Tenant-ready, no tenant-implementado.** El producto apunta a SaaS multi-tenant a futuro, pero construirlo ahora sería esfuerzo desperdiciado. Lo que sí se hace desde el día 1, porque después es una migración dolorosa:
- `organization_id` NOT NULL en toda tabla de negocio.
- Scoping automático por organización en la capa de repositorio, **nunca** escrito a mano en un service.
- Cero branding quemado: nombre, logo y textos del PDF salen de la fila de `organizations`.

Lo que se aplaza: signup de organizaciones, billing, invitaciones, subdominios, selector de organización.

**Auth propia con Passport (local + Google OAuth), no un proveedor gestionado.** Decisión del usuario: control total sobre el modelo de permisos y sin coste por usuario.

**Sin infraestructura de tests en este trabajo.** El usuario construye el proceso de verificación y validación a lo largo del semestre, y es él quien debe hacerlo. **No añadas Jest, Vitest, Playwright, GitHub Actions ni Husky.** Sí escribe código testeable: services sin acoplamiento a HTTP ni a Prisma, dependencias inyectadas, lógica de negocio en funciones puras.

---

## 5. Convenciones

### Idioma
- **Todo lo que vive dentro del código va en inglés**: identificadores, nombres de archivo, columnas de BD, comentarios, mensajes de log y mensajes de commit. El código original mezclaba (`cantidades`, `botellas`, `cajas`, `licores`, `nombre`, `tipo`, `fecha`); eso se elimina.
- El español queda para la documentación del repositorio (`CLAUDE.md`, `README.md`) y para el copy de la interfaz.
- **Copy de la interfaz: nunca literal en el JSX.** Va a `src/i18n/messages/{es,en}.json` (Fase 7). `es` es el idioma por defecto.

### Comentarios

**El comentario por defecto es no escribirlo.** Un comentario es deuda: hay que mantenerlo sincronizado con el código y, cuando deja de estarlo, miente. La mayoría son innecesarios porque el código ya lo dice.

Se escribe un comentario cuando explica **por qué**, no **qué**:

```ts
// ✗ Restata lo que el código ya dice
// Incrementa el contador
counter += 1;

// ✓ Explica una decisión que no se deduce del código
// Grouped by delta: 215 sequential updates blow past Prisma's 5s
// transaction timeout against a remote database.
```

Qué sí merece un comentario:
- Una decisión no obvia y su alternativa descartada.
- Una restricción externa (límite de un proveedor, bug de una librería, requisito legal).
- Una invariante que el tipo no puede expresar.
- JSDoc en lo público cuando el nombre no basta: qué lanza, qué asume.
- `TODO`/`FIXME` con contexto suficiente para actuar.

Qué no:
- Parafrasear la línea siguiente.
- Banners y separadores ASCII para dividir secciones. Si un archivo necesita separadores, necesita partirse en varios.
- Comentar código muerto en vez de borrarlo: para eso está git.
- Encabezados con autor o fecha: eso lo sabe git.

Si un fragmento necesita un comentario para entenderse, primero considera si un nombre mejor o una función extraída lo hacen innecesario.

### Nada quemado
Ni colores, ni z-index, ni endpoints, ni textos, ni valores de negocio, ni nombres de empresa. Si un valor aparece dos veces, es un token o una constante. Los sitios donde vivir:
- Colores, tipografía, radios, z-index, motion → `src/styles/tokens.css` (CSS custom properties), consumidas por `tailwind.config.ts`. El espaciado es la escala de Tailwind, no se redefine.
- Constantes de negocio y navegación → `src/config/`.
- Textos → `src/i18n/messages/`.
- Branding (nombre, logo, datos legales) → viene de la API, de la organización.

### Tres niveles de componente
```
components/ui/       Primitivos globales. Sin lógica de negocio, sin llamadas a la API.
                     Hoy existen: Button, Input, Select, Dialog, ConfirmDialog,
                     Popover, Card, Badge, Spinner, EmptyState.
components/layout/   Estructura: AppShell, Sidebar, Topbar, MarketingNav, Footer.
features/<dominio>/  Funcionalidad: componentes, hooks y lógica de un dominio concreto
                     (catalog, movements, reports, auth, admin).
app/**/page.tsx      Vistas. Componen features y layout. Delgadas.
```
Regla de dirección de dependencias: `app/` → `features/` → `components/ui/`. Nunca al revés. Un componente de `ui/` que importe algo de `features/` está mal ubicado.

### Estado
- **Estado de servidor**: TanStack Query. No `useEffect` + `useState` para fetching.
- **Estado de UI local**: dentro del componente que lo posee. Un dropdown gestiona su propio `isOpen`; no se sube al padre.
- **Estado de negocio compartido**: hooks propios en `features/` (`useMovementDraft`, `useCatalogFilters`).

Antipatrón a evitar (es literalmente el estado actual de `src/app/page.tsx`): un componente con 560 líneas, 10 `useState`, 2 `useReducer`, fetching, agregación de datos y manipulación del DOM. Se desmonta en la Fase 5.

### Estilos
- Tailwind con tokens del tema. **Nunca** `!important` en las clases: si necesitas pisar un estilo, el componente base está mal diseñado. Usa `cn()` (`@/lib/utils`, clsx + tailwind-merge) para componer clases — con tailwind-merge la clase del call site gana sin `!important`.
- **Nunca** valores arbitrarios de color (`bg-[#D4AF37]`) ni de z-index (`z-[9999]`). Usa tokens. ESLint avisa de ambos.
- Un solo componente responsive, no una versión mobile y otra desktop duplicadas.

**Nombres de color disponibles** (todos con modificador de alfa, `bg-accent/20` funciona):
`background`, `foreground`, `contrast`, `placeholder`, `border`, `scrim`, `surface`, `surface-raised`, `accent`, `accent-hover`, `success`, `warning`, `info`, `danger`, `danger-strong`.

⚠️ Sobreviven cuatro alias **deprecados** apuntando a los mismos tokens, para que las vistas pre-Fase-5 sigan compilando: `primary` (= `foreground`), `secondary` (= `contrast`), `accentHover`, `cardBg` (= `surface`). **No los uses en código nuevo**; se borran con esas vistas en la Fase 5.

**Escala de z-index** (en vez de los `z-[9999]` de antes): `z-sticky` < `z-floating` < `z-overlay` < `z-modal` < `z-dropdown` = `z-popover` < `z-toast`. Los dropdowns van por encima del modal a propósito: un `Select` abierto dentro de un `Dialog` tiene que pintarse sobre él.

**Formatters**: `@/lib/utils` (`toDateKey`, `parseDateKey`, `formatLongDate`, `formatShortDate`, `formatDateTime`, `formatMonthYear`, `getMonthNames`, `getWeekdayNames`, `pluralize`, `formatNumber`). El locale sale de `@/config/locale`, no de literales `'en-US'`.

`DataTable` y `Pagination` quedan sin construir a propósito: la API pagina por cursor, y un componente de paginación numerada diseñado sin ese contrato delante saldría mal. Se hacen en la Fase 5/6 con el consumidor real.

### Accesibilidad
Los overlays (dropdown, select, modal, popover) se construyen sobre **Radix UI**, no con `div`s y `onClick`. Radix da gratis roles ARIA, navegación por teclado, focus trap y cierre con Escape — nada de lo cual existe en el código original.

### Datos
- Toda consulta de lista va **paginada, filtrada y ordenada en el servidor** vía query params. Nunca traer la colección completa y filtrar en el cliente.
- Toda agregación (estadísticas, totales) se hace en SQL, no en el navegador.

### Git

**Nunca añadir a Claude como coautor.** Sin `Co-Authored-By`, sin firmas, sin "Generated with". Los commits son del autor del repositorio.

**Los mensajes de commit se escriben siempre en inglés**, igual que el código (ver arriba). Esta documentación está en español; los commits no.

**Formato del mensaje:** `type: what changed and why`

Tipos: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`.

El mensaje debe dar trazabilidad —que se entienda qué pasó y por qué sin abrir el diff— pero sin abrumar. Una línea de asunto clara y, si de verdad hace falta, dos o tres de cuerpo. Nada de cuerpos de veinte líneas.

```
fix: declare only the icons that exist and correct the document lang

favicon-16x16, apple-touch-icon and the android-chrome variants were never
generated, so all four references returned 404. lang goes to "en" because the
current copy is entirely in English.
```

**Agrupación de archivos.** Un commit reúne un cambio con una sola intención. Ni un commit por archivo, ni cajones de sastre con 50 archivos.

- Objetivo: **máximo ~15 archivos por commit**.
- Se puede pasar de ahí solo cuando separar sería artificial y menos ordenado — un reformateo automático, un renombrado masivo, una migración mecánica de imports.
- Si un cambio grande mezcla intenciones (por ejemplo formateo + lógica), primero se separa por intención y después se mira el número de archivos.

---

## 6. Modelo de datos

Definido en Prisma en el repo de la API. Resumen para entender lo que consume el front:

**Identidad**
- `organizations` — el tenant. Nombre, slug, logo, datos legales, zona horaria, settings. Alimenta el branding.
- `users` — pertenece a una organización. `role`: `PLATFORM_ADMIN | ORG_ADMIN | MANAGER | OPERATOR`. `password_hash` es nullable (usuarios solo-Google).
- `auth_identities` — proveedores OAuth vinculados. Un usuario puede tener password **y** Google.
- `refresh_tokens` — hasheados, con rotación y detección de reuso.

**Catálogo**
- `categories`, `brands` — antes eran strings sueltos dentro de la tabla de licores.
- `products` — el licor. `case_size` define cuántas unidades base tiene una caja.
- `locations` — dónde vive el stock. Una fila default; deja modelado el multi-bodega sin construir la UI.

**Inventario**
- `movements` — `type`: `INBOUND | OUTBOUND | ADJUSTMENT`. `status`: `DRAFT | CONFIRMED | CANCELLED`. Con `occurred_at`, `created_by_user_id` y código legible (`MOV-2026-0001`).
- `movement_items` — las líneas. **Fuente de verdad del inventario.** Guardan `quantity_base` (normalizado con `case_size`) y un snapshot del nombre del producto, para que un PDF viejo siga siendo fiel aunque el producto se renombre después.
- `stock_levels` — proyección materializada de las existencias, actualizada **en la misma transacción** que confirma o anula un movimiento. Se lee en O(1) y siempre es reconstruible desde el ledger.
- `audit_logs` — quién hizo qué, cuándo y desde dónde.

---

## 7. Roles y permisos

El modelo sigue el principio de **segregación de funciones**, el control base de cualquier sistema de inventario: quien mueve la mercancía no debe poder alterar los números que la justifican. El control crítico son los ajustes — es donde se esconde un descuadre — por eso están restringidos y siempre exigen motivo.

| Acción | OPERATOR | MANAGER | ORG_ADMIN |
|---|:---:|:---:|:---:|
| Registrar salida (`OUTBOUND`) | ✅ | ✅ | ✅ |
| Registrar entrada (`INBOUND`) | ❌ | ✅ | ✅ |
| Registrar ajuste (`ADJUSTMENT`) | ❌ | ✅ *(motivo obligatorio)* | ✅ |
| Anular un movimiento confirmado | ❌ | ✅ | ✅ |
| Ver historial y existencias | ✅ | ✅ | ✅ |
| Ver reportes y estadísticas | ❌ | ✅ | ✅ |
| CRUD de catálogo | ❌ | ❌ | ✅ |
| Usuarios, roles y organización | ❌ | ❌ | ✅ |
| Log de auditoría | ❌ | ❌ | ✅ |

La matriz vive en **una sola definición declarativa** en la API (`common/permissions/permissions.config.ts`), la consume el `PermissionsGuard` y se expone al front en `/auth/me`. El front la usa para ocultar lo que el usuario no puede hacer — pero **la autorización real siempre es del backend**; ocultar un botón no es un control de seguridad.

Nada de `if (user.role === 'admin')` desperdigado por el código.

### Lo que el front tendrá que consumir (ya construido en la API)

`GET /auth/me` devuelve `{ user, organization, permissions }`. La lista de `permissions` es de strings tipo `movement:create-outbound` o `catalog:manage`; el front condiciona la UI sobre esa lista, nunca sobre `role`.

La sesión son dos piezas: un **access token JWT corto que se guarda en memoria** —nunca en `localStorage`— y una **cookie de refresh httpOnly** que el navegador maneja solo. Cuando el access token expira, `POST /auth/refresh` con `credentials: 'include'` devuelve uno nuevo. El login con Google no devuelve token: redirige a `/auth/callback` con la cookie ya puesta, y esa página tiene que llamar a `/auth/refresh` para obtener el access token.

Los refresh tokens rotan y hay **detección de reuso**: si el front manda dos veces el mismo, la API revoca todas las sesiones de ese usuario. El wrapper del cliente debe serializar los refresh concurrentes en una sola llamada, o un par de peticiones simultáneas con el token vencido cierran la sesión.

### El dominio (Fase 3, ya construido)

`GET /docs-json` expone el contrato completo: **30 rutas, 58 esquemas**, con la API corriendo en `:3001`.

⚠️ El script `pnpm api:types` y la dependencia `openapi-typescript` **todavía no existen en este repo**: montarlos es trabajo de la Fase 5, junto con el cliente y el wrapper de auth. La Fase 4 no los necesita. Lo esencial para diseñar las vistas:

- **Catálogo** — `/products`, `/categories`, `/brands`. Todo paginado por cursor con `search`, filtros y orden en el servidor: no descargues los 215. Leer es abierto a cualquier autenticado; escribir exige `catalog:manage`. Los productos no se borran, se desactivan con `isActive: false`.
- **Movimientos** — el ciclo es **crear borrador → confirmar**, en dos llamadas. `POST /movements` abre un `DRAFT` que no toca existencias; `POST /movements/:id/confirm` aplica el delta. Eso es justamente lo que da el borrador persistente de la Fase 6. Anular es `POST /movements/:id/cancel` con motivo, y revierte el stock.
- **Cantidades** — `quantity` va **positiva** en `INBOUND` y `OUTBOUND` (el tipo lleva la dirección) y **con signo** en `ADJUSTMENT`, que corrige hacia ambos lados y **exige `reason`**. La unidad es `BOTTLE` o `CASE`; la API normaliza con el `caseSize` del producto.
- **Existencias** — `/stock` paginado, `/stock/low` para la tarjeta de "bajo mínimo" del dashboard, `/stock/:productId/kardex` para el histórico de un producto con saldo corrido.
- **Reportes** — `/reports/summary`, `/reports/consumption` (`groupBy=product|category|brand`, que es lo que hoy calcula el navegador) y `/reports/activity` (serie temporal). Rango omitido = últimos 30 días.
- **PDF** — `GET /movements/:id/pdf`. Ya no es un IDOR: va scopeado a la organización.
- **Errores** — todos con la misma forma: `{ statusCode, error, message, path, timestamp }`, donde `message` puede ser un string o un array (los errores de validación).

---

## 8. Estructura objetivo del front

```
src/
  app/
    (marketing)/      landing, features, legal — estático (SSG), público
    (auth)/           login, register, callback de Google
    (app)/            producto autenticado; layout con shell y guard
      dashboard/  movements/  catalog/  reports/  admin/
  components/
    ui/               primitivos (ver §5)
    layout/           AppShell, Sidebar, Topbar, MarketingNav, Footer
  features/           catalog · movements · reports · auth · admin
  lib/
    api/              cliente generado desde OpenAPI + wrapper con auth y refresh
    utils/            cn(), formatters de fecha/número/plural
    hooks/
  config/             constantes, navegación, feature flags
  styles/             tokens.css + globals.css
  i18n/               messages/es.json · messages/en.json
```

Imports siempre por alias `@/`, nunca relativos que suban de directorio (`../../`).

---

## 9. Trampas conocidas

- **Cookie cross-site.** El plan de despliegue es Vercel (front) + Render (API) sin dominio propio, así que la cookie de refresh queda cross-site y obligada a `SameSite=None; Secure`. Safari la bloquea por ITP. Funciona en local y en Chrome/Edge/Firefox; el arreglo real es un dominio propio con `app.` y `api.` bajo el mismo padre.
- **Pooler de Supabase.** El pooler en modo transacción (puerto 6543) no puede correr migraciones de Prisma. Hacen falta dos variables: `DATABASE_URL` (pooler, runtime) y `DIRECT_URL` (directa, puerto 5432, migraciones).
- **Passwords en connection strings.** Si contienen `/`, `%`, `@` o `:` hay que URL-encodearlos o la conexión falla con un error de parseo poco descriptivo.
- **`"use server"`.** Mientras queden server actions en este repo, todo archivo que toque la base de datos debe llevar la directiva. Sin ella, si un client component lo importa, el driver y la connection string acaban en el bundle del navegador.

---

## 10. Deuda del código original (contexto histórico)

Lo que había antes de la reescritura, para que se entienda por qué las convenciones son las que son.

Cerrado en la Fase 4:

- ~~El mismo dropdown copiado siete veces, con z-index ajustados a mano entre `z-[110]` y `z-[9999]`~~ → un `Select` de Radix, escala de z-index tokenizada.
- ~~La tarjeta de licor escrita dos veces, una para móvil y otra para escritorio (~220 líneas duplicadas)~~ → un bloque responsive. Las clases `sm:` de la versión móvil ya coincidían con los valores fijos de la de escritorio, así que unificar no cambió nada visualmente.
- ~~`AdvancedFilters` con 22 props, diez de ellas pares `isOpen`/`setIsOpen`~~ → 4 props y los cinco campos en una definición declarativa; cada `Select` gestiona su propio estado. 395 líneas → 90.
- ~~Sistema de botones con 13 variantes + 13 wrappers que los call sites pisaban con `!important`~~ → 5 variantes, 6 tamaños, cero `!important` en el repo.
- ~~La paleta definida tres veces~~ → una vez en `tokens.css`. Queda la de `pdf.ts`, que muere con el corte a la API en la Fase 5 (ese PDF ya está reimplementado en el backend).
- ~~El mismo spinner copiado en tres sitios~~ y ~~`formatDateLocal` duplicado~~ → `Spinner` y `@/lib/utils`.
- Modales sin focus trap, dropdowns sin roles ARIA, notificaciones sin `aria-live` → resuelto vía Radix y una live region que se monta siempre.
- Un bug de paso: navegar de mes en el date picker sobrescribía el filtro de fecha con el día 1 del mes visitado. El mes visible es ahora estado propio.

Pendiente para la Fase 5:

- `src/app/page.tsx`: 560 líneas con toda la aplicación dentro. Navegación por string en estado, sin rutas — sin deep links ni botón atrás.
- Cuatro declaraciones del tipo `Licor`.
- API sin autenticación, sin validación de entrada y sin manejo de errores; PDFs descargables por UUID sin comprobar propiedad.
- `SELECT * FROM movimientos` sin paginación: la tabla entera viaja al navegador en cada carga de historial y de estadísticas, que además se agregan en el cliente.
- El inventario se llama inventario pero no existen las existencias en ninguna parte.
- Nombres de dominio en español dentro del código (`cantidades`, `botellas`, `cajas`, `licores`): se van cuando las vistas pasen a consumir la API nueva.
