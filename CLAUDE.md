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
| 3 | API: catálogo, inventario con stock, reportes, PDF | 🔄 Siguiente |
| 4 | Front: design system (tokens CSS, primitivos Radix, `cn()`) | ⬜ Pendiente |
| 5 | Front: reestructura a rutas reales + corte a la API nueva | ⬜ Pendiente |
| 6 | Front: dashboard de existencias + panel de administración | ⬜ Pendiente |
| 7 | Front: landing page + i18n + parametrización de branding | ⬜ Pendiente |
| 8 | READMEs y documentación final | ⬜ Pendiente |

Plan completo: `C:\Users\Tomas\.claude\plans\ok-voy-a-hacerle-tender-sprout.md`

**Este repositorio no se toca hasta la Fase 4.** Las fases 2 y 3 ocurren enteras en `beverage-ledger-api`; aquí no hay nada que hacer mientras tanto.

**Hasta la Fase 5, la app sigue funcionando contra la base de datos Neon vieja.** No borres `src/app/actions.ts`, `src/app/actions-licores.ts` ni `src/app/api/` antes del corte — la app deja de funcionar. La base nueva de Supabase ya existe y está sembrada, pero todavía no la consume nadie.

---

## 3. Comandos

```bash
npm run dev        # servidor de desarrollo (Turbopack) en :3000
npm run build      # build de producción
npm run start      # servir el build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run format     # Prettier --write
```

Variables de entorno: copia `.env.example` a `.env`. **Nunca** commitees `.env` ni pegues credenciales en archivos versionados (incluido este).

---

## 4. Decisiones de arquitectura (y su porqué)

Estas decisiones ya están tomadas. No las revisites sin hablarlo con el usuario.

**Front y back en repos separados.** El backend es un servicio propio, no un detalle de implementación de Next. Debe poder servir a otros clientes (móvil, integraciones) sin arrastrar el framework de front.

**Contrato vía OpenAPI generado, no tipos escritos a mano.** Nest genera el OpenAPI desde sus DTOs; el front corre `npm run api:types` y regenera `src/lib/api/schema.d.ts` con `openapi-typescript`. Motivo: el código original tenía **cuatro declaraciones distintas** del tipo `Licor` que se desincronizaban en silencio. Con el contrato generado, un cambio en la API rompe la compilación del front en vez de romper producción.

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
- Colores, tipografía, espaciado, radios, z-index → `src/styles/tokens.css` (CSS custom properties), consumidas por `tailwind.config.js`.
- Constantes de negocio y navegación → `src/config/`.
- Textos → `src/i18n/messages/`.
- Branding (nombre, logo, datos legales) → viene de la API, de la organización.

### Tres niveles de componente
```
components/ui/       Primitivos globales. Sin lógica de negocio, sin llamadas a la API.
                     Button, Input, Select, Dropdown, Modal, Card, Badge, Spinner,
                     EmptyState, Pagination, DataTable.
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

Antipatrón a evitar (es literalmente el estado actual de `src/app/page.tsx`): un componente con 600 líneas, 11 `useState`, 2 `useReducer`, fetching, agregación de datos y manipulación del DOM, que pasa 22 props a un hijo.

### Estilos
- Tailwind con tokens del tema. **Nunca** `!important` en las clases: si necesitas pisar un estilo, el componente base está mal diseñado. Usa `cn()` (clsx + tailwind-merge) para componer clases.
- **Nunca** valores arbitrarios de color (`bg-[#D4AF37]`) ni de z-index (`z-[9999]`). Usa tokens.
- Un solo componente responsive, no una versión mobile y otra desktop duplicadas.

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

Lo que había antes de la reescritura, para que se entienda por qué las convenciones son las que son. Todo esto desaparece entre las Fases 4 y 5:

- `src/app/page.tsx`: 600 líneas con toda la aplicación dentro. Navegación por string en estado, sin rutas — sin deep links ni botón atrás.
- Cuatro declaraciones del tipo `Licor`; la paleta de colores definida tres veces (`tailwind.config.js`, `globals.css`, `pdf.ts`).
- El mismo dropdown copiado siete veces, con z-index ajustados a mano entre `z-[110]` y `z-[9999]`.
- La tarjeta de licor escrita dos veces, una para móvil y otra para escritorio (~220 líneas duplicadas).
- `AdvancedFilters` con 22 props, diez de ellas pares `isOpen`/`setIsOpen` que deberían ser estado interno.
- Sistema de botones con 13 variantes que los call sites pisaban con `!important`.
- API sin autenticación, sin validación de entrada y sin manejo de errores; PDFs descargables por UUID sin comprobar propiedad.
- `SELECT * FROM movimientos` sin paginación: la tabla entera viajaba al navegador en cada carga de historial y de estadísticas, que además se agregaban en el cliente.
- El inventario se llamaba inventario pero no existían las existencias en ninguna parte.
