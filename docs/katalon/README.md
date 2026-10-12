# Pruebas E2E con Katalon Studio: guía para grabarlas a mano

Estas pruebas se graban a mano con el Web Recorder de Katalon Studio. Cubren los mismos flujos que la suite de Serenity/JS de `tests/e2e/`, así que las dos se pueden comparar escenario por escenario.

## 0. Antes de empezar

1. Instalar **Katalon Studio** desde katalon.com (la edición gratuita alcanza) e iniciar sesión con una cuenta de Katalon.
2. Levantar el front contra la API de Render, como para la suite de Serenity:

   ```bash
   NEXT_PUBLIC_API_URL=https://beverage-ledger-api.onrender.com pnpm dev
   ```

3. Entrar una vez a mano a `http://localhost:3000/login` para "despertar" la API de Render. La primera petición después de un rato tarda hasta un minuto, y una grabación que espera tanto suele quedar rota.
4. Tener a mano la cuenta de pruebas (`TEST_USER_EMAIL` / `TEST_USER_PASSWORD` del `.env`).

## 1. Crear el proyecto

1. **File → New → Project**. Nombre: `beverage-ledger-katalon`. Tipo: **Web**. Guárdalo fuera de este repositorio, porque Katalon genera muchos archivos propios.
2. **Profiles → default**: agrega tres variables globales. Así ninguna prueba guarda la URL ni la cuenta escritas a mano:

   | Nombre | Tipo | Valor |
   |---|---|---|
   | `baseUrl` | String | `http://localhost:3000` |
   | `email` | String | la cuenta de pruebas |
   | `password` | String | la contraseña, cifrada con **Help → Encrypt Text** |

3. **Project → Settings → Execution → Default wait for element timeout**: súbelo a **30 s**. Ahí mismo deja activado **Smart Wait**, que espera a que la página termine de pedir datos antes de cada paso.

## 2. Cómo grabar cada caso

Para cada flujo de la tabla del punto 3:

1. **File → New → Test Case**, con el nombre de la tabla (por ejemplo `RF-22 Ver existencias`).
2. Abre el caso y pulsa **Record Web** en la barra. Elige **Chrome**, escribe `http://localhost:3000/login` en la URL y pulsa **Record**.
3. Haz el flujo en el navegador que abre Katalon como lo haría una persona: escribir, hacer clic y navegar **por el menú**. No escribas URLs: una navegación completa pierde la sesión, que vive en memoria.
4. Para dejar una **verificación**, haz clic derecho sobre el elemento en el navegador grabado y elige **Verify Element Text** o **Verify Element Present**. Si tu versión no lo ofrece en el navegador, añádela después en la vista **Manual** (paso 6).
5. Pulsa **Stop** y luego **Save Script**. Guarda los objetos en una carpeta del **Object Repository** con el nombre de la pantalla (`Login`, `Existencias`, `Kardex`…).
6. En la vista **Manual** del caso, limpia lo grabado:
   - Cambia el correo y la contraseña escritos por `GlobalVariable.email` y `GlobalVariable.password`. Para la contraseña usa **Set Encrypted Text** en vez de **Set Text**.
   - Cambia la URL de **Open Browser** / **Navigate To Url** por `GlobalVariable.baseUrl + '/login'`.
   - Antes de cada verificación, añade **Wait For Element Visible** sobre el mismo objeto, con 30 s.
   - Borra los clics accidentales y los `Set Text` repetidos que deja el grabador.
7. **Haz los selectores estables.** Abre cada objeto del repositorio y, en **Selection Method**, cambia el XPath absoluto (`/html/body/div[1]/…`) por uno de estos, que no se rompen cuando cambia el diseño:

   | Elemento | Selector recomendado |
   |---|---|
   | Correo | CSS `input[type="email"]` |
   | Contraseña | CSS `input[type="password"]` |
   | Botón Entrar | XPath `//button[normalize-space()="Entrar"]` |
   | Enlace del menú | XPath `//nav[@aria-label="Principal"]//a[normalize-space()="Existencias"]` |
   | Búsqueda de existencias | CSS `input[aria-label="Buscar existencias por producto"]` |
   | Botón "+" de botella | CSS `button[aria-label="Añadir botella"]` |
   | Aviso de error del login | CSS `form [role="alert"]` |
   | Título de la página | XPath `//h1` |

   El aviso del login va dentro del formulario a propósito: Next.js pone su propio `role="alert"` vacío en cada página, y un selector sin acotar lo encuentra primero.

8. Ejecuta el caso con **Run → Chrome** hasta que pase dos veces seguidas.

## 3. Los casos a grabar

| Caso | Pasos | Verificación |
|---|---|---|
| **Login correcto** | Abrir `/login` → correo y contraseña → Entrar | **Verify Element Present**: enlace "Existencias" del menú. **Verify Url** contiene `/dashboard` |
| **Login inválido** | Correo `nadie@beverage-ledger.test`, contraseña `no-es-la-clave` → Entrar | **Verify Element Text** del aviso = `Invalid email or password` |
| **RF-22 Ver existencias** | Login → menú **Existencias** | Título `Existencias`; **Verify Element Present** de la tabla; texto de la paginación contiene `de` y `resultados` |
| **RF-23 Filtrar** | Login → Existencias → escribir `AMARO` en la búsqueda → esperar 2 s | El primer producto de la tabla contiene `AMARO` |
| **RF-23 Sin coincidencias** | Igual, buscando `zzz-producto-que-no-existe` | **Verify Text Present**: `Ningún producto coincide con esos filtros.` |
| **RF-24 Kardex** | Login → Existencias → clic en el primer producto | El título `h1` es el nombre en el que se hizo clic; el saldo de la primera fila (5.ª columna) es igual al número sobre "En existencia" |
| **RF-27 Bajo mínimo** | Login (queda en el Panel) | **Verify Element Present**: título "Bajo mínimo" y al menos un producto en su lista, o el texto `Nada está por debajo de su mínimo.` |
| **RF-28 Reporte** | Login → menú **Reportes** → clic en **Año** → clic en **Por categoría** | El botón "Por categoría" tiene `aria-pressed="true"` (**Verify Element Attribute Value**); la primera posición del ranking es `1` |
| **RF-19 Borrador** | Login → Panel → **Registrar una salida** → "+" de botella dos veces → **Refresh** del navegador | **Verify Element Present**: botón que contiene `2 unidades`. Para cerrar: **Descartar** → **Descartar** en el diálogo |

Para comparar dos valores (RF-24), guarda el primero en una variable con **Get Text** (columna *Output*: `nombre`) y verifica el segundo con **Verify Match** o **Verify Equal** contra esa variable.

## 4. Suite y reporte

1. **File → New → Test Suite**: `Suite E2E`. Añade todos los casos con **Add**, y el de login inválido al final.
2. Ejecuta la suite con **Run → Chrome**.
3. **Ojo con el límite de la API:** acepta 10 inicios de sesión por minuto por IP, y cada caso inicia sesión. Si la suite falla con un aviso de "Too Many Requests", añade **Delay 7** al principio de cada caso, o ejecuta la suite en dos tandas.
4. El resultado queda en la carpeta **Reports** del proyecto. Clic derecho sobre la ejecución → **Export as HTML** (o PDF / CSV) para adjuntarlo como evidencia.

## 5. Problemas típicos

| Síntoma | Causa | Arreglo |
|---|---|---|
| El primer paso falla por timeout | La API de Render estaba dormida | Entrar una vez a mano antes y subir el timeout a 30 s |
| Después de navegar aparece el login otra vez | Se navegó por URL y la sesión vive en memoria | Navegar con clics en el menú |
| "Element not found" en un objeto grabado | XPath absoluto que cambió con el diseño | Usar los selectores de la tabla del punto 2 |
| La búsqueda verifica la lista vieja | Hay un debounce de 300 ms y luego la petición | **Wait For Element Text** o **Delay 2** antes de verificar |
| Funciona en Chrome y falla en Safari | Safari bloquea la cookie de sesión entre dominios (ITP) | Grabar y ejecutar en Chrome |
| "Too Many Requests" al iniciar sesión | Límite de 10 logins por minuto | Ver el punto 4.3 |
