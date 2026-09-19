# Landing pública de Lignum Vitae: catálogo, cotizador y link de cotización

## Contexto

Lignum Vitae vende velas personalizadas de recuerdo (XV años, bautizos, bodas) en Durango. Hoy solo existe el
portal admin (Vite + React) y la API (NestJS + Prisma). El repo ya estaba preparado para una landing en **Astro**
que nunca se construyó:
- `.gitignore` ignora `.astro/`, el puerto 4321 aparece en `PUBLIC_SITE_URL` y `CORS_ORIGINS`, existe la variable `PUBLIC_API_URL` y el script `dev:landing`.
- El schema ya tiene `QuoteRequest` (NEW/CONVERTED/DISMISSED), que es la "solicitud cruda del cotizador público", pero no hay endpoints ni pantalla que la usen.
- `SettingsService.getPublic()` existe pero ningún controller lo expone.
- `Product` y `CandleCategory` ya tienen `isVisibleOnLanding` e `isFeatured`.
- El admin y el PDF ya mandan links a `{PUBLIC_SITE_URL}/cotizacion/:token`, que hoy dan 404.

Lo que sí falta:
- Todo el catálogo está detrás de `@Auth()`.
- `GET /products` devuelve costos, márgenes e insumos.
- El throttler no ve la IP real detrás del proxy de Railway.

**Decisiones que ya tomaste:** no mostrar precios (solo cotizar), bandeja simple en el admin con precarga de la
cotización, e incluir la página `/cotizacion/:token`.

## Stack: Astro (SSR con `@astrojs/node`)

- **Astro (lo recomiendo):** manda HTML listo desde el servidor, así que el catálogo con fotos carga rápido y aparece en Google. La interactividad (lista de cotización, carrusel) son scripts pequeños. Con SSR, lo que cambie la dueña en el admin se ve al instante, sin volver a compilar. El repo ya estaba preparado para Astro.
- **Next.js:** su parte de servidor duplicaría lo que ya hace NestJS. Es más pesado y no aporta nada que haga falta aquí.
- **React solo (SPA):** es malo para SEO y para la primera carga de un catálogo público. Solo convendría por reusar componentes del admin, y esos componentes son del admin.
- **Carrito y pago a futuro:** la "lista de cotización" en `localStorage` se convierte en el carrito. El pago (MercadoPago/Stripe) vive en NestJS y la landing solo redirige al checkout. Si algún día hay cuentas de cliente, se agregan islas de React (`@astrojs/react`) sin migrar nada.

## Diseño: awesome-design-md → Starbucks, con la paleta de Lignum Vitae

Clono el repo en `C:\Randy\awesome-design-md` (clon superficial). Queda al lado de tus proyectos para reusarlo en
cualquiera de ellos y fuera de este repo.

**Candidato preseleccionado: `design-md/starbucks`.** El paso P1 lo confirma contra Airbnb, Mastercard, Claude y Notion.
- **Estructura:** Starbucks usa un sistema de 4 verdes sobre lienzo crema. Lignum Vitae tiene sage/moss/teal sobre cream.
- **Tipografía:** Starbucks combina sans, serif y script. Lignum Vitae tiene Jost, Fraunces y Parisienne.
- **Componentes:** ya trae detalle de producto (PDP) con stepper de cantidad, tarjetas y bandas oscuras.

Mapeo de roles (sin inventar colores; todo sale de `packages/tailwind-preset/theme.css`):

| Rol en Starbucks | Lignum Vitae |
|---|---|
| CTA "Green Accent" #00754A | teal-700 #3D6660 (hover teal-800) |
| Encabezado "Starbucks Green" #006241 | moss-800 #4A5B53 (color del logo) |
| Banda oscura / footer "House Green" #1E3932 | moss-900 #374039 |
| "Green Light" #d4e9e2 | sage-100 #D1E5C2 / sage-50 |
| Lienzo "Neutral Warm" #f2f0eb | cream-50 #F7F4EC |
| "Ceramic" #edebe9 | cream-100 #E9E3D3 |
| Tarjeta blanca | paper #FFFFFF |
| Texto principal / secundario | ink #26302A / moss-600 #5C6E63 |
| Gold (Rewards) | se elimina (no hay equivalente) |
| SoDoSans / Lander Tall / Kalam | Jost / Fraunces / Parisienne |

## Prompt reutilizable (para este u otro proyecto)

```
Tengo clonado https://github.com/VoltAgent/awesome-design-md en C:\Randy\awesome-design-md.
Cada design-md/<marca>/DESIGN.md describe un sistema de diseño: tema, paleta con roles,
tipografía, componentes, layout, do's/don'ts, responsive y guía de prompts.

Proyecto: <RUTA>. Negocio: <QUÉ VENDE, A QUIÉN, DÓNDE>. Sitio: <landing / catálogo /
ecommerce + funciones clave>. Paleta de marca (fuente de verdad, no se edita): <RUTA a
brand.json/theme.css>. Fuentes de marca: <display / body / accent>.

TAREA 1 — Elegir (no escribas código):
1. Lee solo el tema visual (sección 1 o el "description" del front-matter) de TODOS los
   DESIGN.md y preselecciona 5 afines al negocio.
2. Lee completos esos 5 y califica 1–5: (a) tono vs. negocio, (b) cuántos roles de color
   cubre la paleta de marca SIN inventar colores, (c) componentes que ya resuelven las
   páginas del sitio (listado, detalle de producto, formulario), (d) jerarquía tipográfica
   sustituible por las fuentes de marca, (e) complejidad de implementación (5 = simple).
3. Entrega la tabla, recomienda uno y justifica en 3 líneas.

TAREA 2 — Adaptar el elegido y guardarlo en <DESTINO>/DESIGN.md:
1. Al inicio, una tabla "rol original → token de marca". Nunca un hex fuera de la paleta;
   si un rol no tiene equivalente, elimínalo y dilo.
2. Reemplaza cada color del documento por su token, y las fuentes por las de marca
   manteniendo la jerarquía.
3. Verifica contraste WCAG AA de cada par texto/fondo; si falla, cambia el mapeo, no la paleta.
4. Quita los componentes que no aplican y agrega los del negocio: <SECCIONES>.
5. Conserva la numeración de secciones del original para que un agente pueda seguirlo.
```

Para Lignum Vitae los valores son estos:
- **Proyecto:** `C:\Randy\LignumVitae`.
- **Negocio:** velas personalizadas de recuerdo para eventos, con entrega solo en Durango.
- **Sitio:** catálogo por categorías, detalle con carrusel, lista de cotización y carrito a futuro.
- **Paleta:** `packages/tailwind-preset/theme.css`.
- **Fuentes:** Fraunces / Jost / Parisienne.
- **Destino:** `apps/landing`.
- **Secciones:** aviso de entrega en Durango y 7 días, cómo funciona, nosotros, contacto y cotización pública.

## Archivos que se tocan (rutas completas)

**API (existentes):**
- `C:\Randy\LignumVitae\apps\api\src\main.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\public\public.module.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\sales\sales.module.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\sales\quotations\dto\create-quotation.dto.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\sales\quotations\usecases\create-quotation.usecase.ts`
- `C:\Randy\LignumVitae\apps\api\src\common\errors\sales.errors.ts`
- `C:\Randy\LignumVitae\packages\types\src\client\openapi-schema.d.ts` (se regenera)

**API (nuevos):**
- `C:\Randy\LignumVitae\apps\api\src\modules\public\public-catalog.controller.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\public\public-quote-requests.controller.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\public\dto\public-catalog.dto.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\public\dto\create-quote-request.dto.ts`
- `C:\Randy\LignumVitae\apps\api\src\modules\sales\quote-requests\`, con `quote-requests.module.ts`, `quote-requests.service.ts`, `quote-request.repository.ts`, `quote-requests.controller.ts` y `dto\`

**Se reusan sin cambios:**
- `SettingsService.getPublic()` en `C:\Randy\LignumVitae\apps\api\src\modules\settings\settings.service.ts`
- `MEXICAN_PHONE_REGEX` en `C:\Randy\LignumVitae\apps\api\src\common\utils\regex.ts`
- El patrón de lista blanca de `C:\Randy\LignumVitae\apps\api\src\modules\public\dto\public-quotation.dto.ts`

**Admin:**
- `C:\Randy\LignumVitae\apps\admin\src\App.tsx`
- `C:\Randy\LignumVitae\apps\admin\src\components\layout\nav.ts`
- `C:\Randy\LignumVitae\apps\admin\src\lib\types.ts`
- `C:\Randy\LignumVitae\apps\admin\src\features\quotations\QuotationFormPage.tsx`
- `C:\Randy\LignumVitae\apps\admin\src\features\quote-requests\QuoteRequestsPage.tsx` (nuevo)

**Landing (todo nuevo), en `C:\Randy\LignumVitae\apps\landing\`:**
- Configuración: `package.json`, `astro.config.mjs`, `tsconfig.json`, `DESIGN.md`
- Recursos: `public\logo.svg`, `public\galeria\*.jpeg`
- Estilos y datos: `src\styles\global.css`, `src\lib\api.ts`, `src\lib\quote-list.ts`
- Vistas: `src\layouts\Layout.astro`, `src\components\ProductCard.astro`
- Páginas: `src\pages\index.astro`, `catalogo.astro`, `producto\[slug].astro`, `cotizar.astro`, `cotizacion\[token].astro`

**Deploy:**
- `C:\Randy\LignumVitae\.railway\railway.ts`

**Plan y encargos:**
- `C:\Randy\LignumVitae\Plans\landing-publica\plan.md` y `encargos\*.md`, siguiendo la convención de la carpeta de plan que ya existe.

---

## Pasos

### P1 [PLAN] Clonar awesome-design-md y elegir el diseño
Hago `git clone --depth 1` en `C:\Randy\awesome-design-md`, corro la Tarea 1 del prompt y te muestro la tabla con
la recomendación. También guardo este plan y los encargos en `Plans/landing-publica/`.

### P2 [PLAN] Escribir `apps/landing/DESIGN.md` adaptado
Corro la Tarea 2 con el mapeo de arriba, reviso el contraste AA y agrego las secciones del negocio. Este archivo
es lo que lee Codex en E7–E12.

### E1 [EJECUCIÓN] API: catálogo público de solo lectura
- **Archivo principal:** `apps/api/src/modules/public/public-catalog.controller.ts` (nuevo).
- **Secundarios:** `public/dto/public-catalog.dto.ts`, `public/public.module.ts` y, si el patrón vecino lo pide, un repository o service propio.
- **Comportamiento nuevo:** sin `@Auth()`. Este encargo autoriza exactamente estos 3 endpoints nuevos.
  - `GET /api/public/settings` devuelve `SettingsService.getPublic()` tal cual.
  - `GET /api/public/catalog` devuelve las categorías `isActive && isVisibleOnLanding`, ordenadas por `sortOrder, name`.
    - Cada categoría trae `{id, name, slug, description, colorHex, coverImageUrl, products[]}`.
    - Cada producto trae `{id, name, slug, kind, description, isFeatured, allowsFragrance, image: {url, alt} | null}`.
    - Solo entran productos `isActive && isVisibleOnLanding`. La imagen es la `isPrimary`, o si no hay, la de menor `sortOrder`.
    - Se omiten las categorías sin productos.
  - `GET /api/public/products/:slug` devuelve `{id, name, slug, kind, description, allowsFragrance, category: {name, slug}, images: [{url, alt}]}`.
    - Las imágenes van ordenadas: primero la primaria, luego por `sortOrder`.
    - Responde 404 (error de catálogo existente) si el producto no existe, está inactivo o no es visible, o si su categoría no es visible.
  - Todas las consultas de Prisma usan `select` explícito (lista blanca). Nunca `productInclude`.
- **NO cambia:** los controllers, DTOs y repositorios de products, categories y settings. Tampoco el schema (sin migraciones).
- **Comprobación:**
  - `pnpm --filter @lignumvitae/api build` y `pnpm --filter @lignumvitae/api test` pasan.
  - `curl localhost:3000/api/public/catalog` sin token responde 200.
  - Buscar `cost|price|margin|suppl|sku|costing` en la respuesta no encuentra nada.
  - Si ocultas un producto en el admin, desaparece del catálogo.
  - Un slug inexistente responde 404.

### E2 [EJECUCIÓN] API: recibir solicitudes de cotización desde la web
- **Archivo principal:** `apps/api/src/modules/sales/quote-requests/quote-requests.service.ts` (nuevo).
- **Secundarios:**
  - `quote-request.repository.ts` y `quote-requests.module.ts`, registrado en `sales.module.ts`.
  - `public/public-quote-requests.controller.ts` y `public/dto/create-quote-request.dto.ts`.
  - `main.ts`.
  - `common/errors/sales.errors.ts` si hace falta un error nuevo.
- **Comportamiento nuevo:** endpoint autorizado `POST /api/public/quote-requests`.
  - Body:
    - `fullName`: 2–120 caracteres.
    - `whatsapp`: `MEXICAN_PHONE_REGEX`.
    - `eventDate`: `YYYY-MM-DD`, obligatorio.
    - `notes?`: máximo 1000 caracteres.
    - `items`: 1–30 renglones `{productId, quantity 1–5000, candleColor? ≤60, ribbonColor? ≤60, withFragrance?}`.
    - `website?`: honeypot.
  - `eventDate` debe ser al menos hoy + `Settings.minLeadTimeDays`, con el mismo cálculo que `create-quotation.usecase.ts:165`. Si no, responde 400 con "Necesitamos al menos N días de anticipación".
  - Cada producto debe existir y estar activo y visible; si no, responde 400.
  - `withFragrance` se fuerza a `false` si el producto no permite aroma.
  - Guarda `items` como JSON con `productName` copiado y `status` NEW.
  - Si el honeypot viene lleno, responde 201 sin guardar nada.
  - La respuesta solo trae `{id, createdAt}`.
  - La ruta lleva `@Throttle({ default: { limit: 5, ttl: 60_000 } })`.
  - En `main.ts` se agrega `app.set('trust proxy', 1)` (con `NestExpressApplication`), para que el throttler vea la IP real detrás de Railway.
- **NO cambia:**
  - `schema.prisma` (sin migración).
  - El nombre `QuoteRequest.whatsapp`.
  - Aquí no se crea el `Customer`.
  - El límite global del throttler se queda en 120/min.
- **Comprobación:**
  - El build y los tests pasan.
  - Un POST válido responde 201 y la fila aparece en `sales.quote_requests` (`pnpm db:studio`).
  - Una fecha a hoy+3 responde 400.
  - `whatsapp: "123"` responde 400.
  - Un campo extra responde 400.
  - El 6.º POST en menos de un minuto responde 429.
  - Con el honeypot lleno responde 201 y no se guarda fila.

### E3 [EJECUCIÓN] API: endpoints del admin para la bandeja
- **Archivo principal:** `apps/api/src/modules/sales/quote-requests/quote-requests.controller.ts` (nuevo), con `@Auth()` a nivel clase.
- **Secundarios:** el service y el repository de E2, más `dto/` (query paginada y `dismiss`).
- **Comportamiento nuevo:** endpoints autorizados.
  - `GET /api/quote-requests?status&page&limit` pagina igual que `QuotationsController` y ordena por `createdAt desc`.
  - `GET /api/quote-requests/:id`.
  - `POST /api/quote-requests/:id/dismiss {reason? ≤300}` pasa la solicitud a DISMISSED. Solo funciona desde NEW; en otro estado responde con error de dominio.
- **NO cambia:** la ruta pública de E2 y el módulo de quotations.
- **Comprobación:**
  - El build pasa.
  - Sin token responde 401; con token lista las solicitudes.
  - Descartar dos veces la misma solicitud hace que la segunda llamada falle.

### E4 [EJECUCIÓN] API: al crear la cotización, la solicitud queda convertida
- **Archivo principal:** `apps/api/src/modules/sales/quotations/usecases/create-quotation.usecase.ts`.
- **Secundarios:** `dto/create-quotation.dto.ts` (agrega `quoteRequestId?: int`), el repository de quote-requests y `packages/types/src/client/openapi-schema.d.ts`, regenerado con `pnpm gen:api` con la API arriba.
- **Comportamiento nuevo:** si viene `quoteRequestId`, todo pasa en la **misma transacción** que crea la cotización.
  - Se valida que la solicitud exista y esté en NEW. Si no, se lanza error y no se crea nada.
  - Se marca CONVERTED con `convertedQuotationId`.
  - Sin `quoteRequestId`, todo funciona exactamente igual que hoy.
- **NO cambia:** el cálculo de precios, el folio, las validaciones actuales, PATCH y duplicar.
- **Comprobación:**
  - Los tests de quotations pasan.
  - Un spec mínimo (en el spec del use case si ya existe) cubre dos casos: solicitud NEW que pasa a CONVERTED, y solicitud ya CONVERTED que da error sin crear la cotización.

### E5 [EJECUCIÓN] Admin: bandeja "Solicitudes web"
- **Archivo principal:** `apps/admin/src/features/quote-requests/QuoteRequestsPage.tsx` (nuevo).
- **Secundarios:**
  - `App.tsx`: ruta `/solicitudes`.
  - `components/layout/nav.ts`: primer item de "Operación", icono `Inbox`.
  - `lib/types.ts`: `QuoteRequestDto` escrito a mano, como el resto.
- **Comportamiento nuevo:**
  - La página usa `PageHeader` y `PageToolbar`, con filtro de estado (NEW por defecto).
  - La tabla muestra fecha, nombre, WhatsApp (link `wa.me/52…`), fecha del evento, total de piezas y estado con `Badge`.
  - La fila se abre con un `<button>` y muestra el detalle en un `Sheet`: renglones (producto, cantidad, color, listón, aroma) y notas.
  - Acciones:
    - "Crear cotización" navega a `/cotizaciones/nueva?solicitud=ID`. Solo aparece en NEW.
    - "Descartar" abre un `ConfirmDialog` con motivo opcional.
    - Si la solicitud está CONVERTED, muestra un link a `/cotizaciones/:convertedQuotationId`.
- **NO cambia:** las demás páginas. Aplican todas las reglas de `AGENTS.md`: tokens, escala tipográfica, primitivas, `aria-label` y nada de componentes anidados.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/admin build` y `lint` pasan.
  - Una solicitud creada por curl (E2) aparece en `/solicitudes`.
  - Al descartarla, se mueve al filtro DISMISSED.

### E6 [EJECUCIÓN] Admin: precarga de la cotización desde la solicitud
- **Archivo principal:** `apps/admin/src/features/quotations/QuotationFormPage.tsx`.
- **Comportamiento nuevo:** solo en alta y con `?solicitud=ID`.
  - Pide `GET /quote-requests/:id` y precarga una sola vez, con el mismo patrón que ya usa el archivo para `existing`:
    - los renglones (`productId`, `quantity`, `candleColor`, `ribbonColor`, `withFragrance`);
    - `eventDate`;
    - `notes`.
  - Busca el cliente con `phone === whatsapp` entre los `customers` de `useCustomerOptions`.
  - Si no existe, muestra una `Card` de aviso "Cliente de la web no registrado: {nombre} · {tel}" con el botón "Darlo de alta". Ese botón hace `httpPost('/customers', {fullName, phone})`, lo selecciona e invalida `customers`.
  - El submit manda `quoteRequestId`.
  - Si la solicitud no está en NEW, muestra un aviso y no precarga nada.
- **NO cambia:** la edición (`/cotizaciones/:id/editar`), el alta sin `?solicitud`, el preview de totales y `CustomerQuickCreateDialog`.
- **Comprobación:**
  - El build y el lint pasan.
  - Desde la bandeja, "Crear cotización" abre el formulario precargado y el preview calcula.
  - Al guardar, la solicitud aparece como CONVERTED con su link.
  - Reusar la misma URL muestra el error en `FormError`.

### E7 [EJECUCIÓN] Landing: esqueleto, tokens y layout
- **Archivo principal:** `apps/landing/src/layouts/Layout.astro`.
- **Secundarios (nuevos):**
  - `package.json`: nombre `@lignumvitae/landing`. Scripts: `dev` = `astro dev --port 4321`, `build` = `astro build`, `start` = `node dist/server/entry.mjs`.
  - `astro.config.mjs`: `output: 'server'`, adapter `@astrojs/node` en modo standalone, plugin `@tailwindcss/vite` y que en producción escuche en `0.0.0.0` y en el `PORT` de Railway.
  - `tsconfig.json`: extiende `astro/tsconfigs/strict`.
  - `src/styles/global.css`:
    - importa `tailwindcss` y `@lignumvitae/tailwind-preset/theme.css`;
    - encima, una capa semántica y una escala tipográfica tomadas de `apps/landing/DESIGN.md`.
  - `src/lib/api.ts`:
    - `getJson(path)` contra `import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api'`: desenvuelve `{data}` y lanza error si la respuesta no es ok;
    - `imageUrl(path)` usa la misma regla que `staticUrl` en `apps/admin/src/lib/api.ts:25`.
  - `public/logo.svg`: copia de `assets/Logotipo 1.svg`.
  - `public/galeria/`: copia de `Galeria/`.
- **Comportamiento nuevo:** el layout recibe `title` y `description`.
  - Base: `lang="es-MX"` y Google Fonts (Fraunces, Jost, Parisienne) con `display=swap`.
  - Barra de aviso superior: "Entregas solo en {city} · Pide con al menos {minLeadTimeDays} días de anticipación", con datos de `/public/settings`.
  - Header: logo, navegación (Catálogo, Cómo funciona, Nosotros, Contacto) y botón "Mi cotización" con contador (`data-quote-count`).
  - Footer: contacto desde settings (WhatsApp, teléfono, email, horario y redes).
- **Dependencias autorizadas, solo estas:** `astro`, `@astrojs/node`, `tailwindcss`, `@tailwindcss/vite` y `@lignumvitae/tailwind-preset` (`workspace:*`). Sin React y sin librería de carrusel.
- **NO cambia:** `packages/tailwind-preset` (no se edita), el admin ni la API. Ningún hex en componentes: solo tokens de `global.css`.
- **Comprobación:**
  - `pnpm install` corre sin errores.
  - Con `pnpm dev:landing`, `localhost:4321` muestra las fuentes y colores de marca y el aviso con datos reales.
  - `pnpm --filter @lignumvitae/landing build` pasa sin errores.
  - Con `pnpm --filter @lignumvitae/landing start`, el sitio levanta.

### E8 [EJECUCIÓN] Landing: página de inicio
- **Archivo principal:** `apps/landing/src/pages/index.astro`.
- **Secundario:** `src/components/ProductCard.astro` (nuevo): imagen 4:5 con carga diferida, nombre, badge "Destacado" y link a `/producto/[slug]`.
- **Comportamiento nuevo:** secciones según `DESIGN.md`:
  - Hero: foto de la galería, H1 en Fraunces, CTA "Ver catálogo" y botón secundario de WhatsApp.
  - Categorías: tarjetas con `coverImageUrl`, o la imagen del primer producto si no hay portada.
  - Destacados: `isFeatured`, máximo 8.
  - `#como-funciona`, con las políticas de `assets/Proceso de pedidos.png` y los datos de settings:
    - mínimo {N} días de anticipación;
    - {depositPct}% de anticipo;
    - pago por transferencia o efectivo;
    - envío con costo adicional y solo en {city};
    - una vez confirmado, sin cambios ni cancelaciones.
  - `#nosotros`: texto breve provisional con un comentario `<!-- TODO dueña -->`.
  - Galería.
  - `#contacto`.
- **NO cambia:** el layout de E7, salvo los links de las anclas.
- **Comprobación:**
  - Se ven categorías y destacados reales.
  - Las anclas del menú funcionan.
  - A 375 px de ancho no hay scroll horizontal (captura con Playwright en móvil y escritorio).

### E9 [EJECUCIÓN] Landing: catálogo completo por categorías
- **Archivo principal:** `apps/landing/src/pages/catalogo.astro`.
- **Comportamiento nuevo:**
  - Una sección por categoría visible, en orden, con `id={slug}`, H2, descripción y grid de `ProductCard`.
  - Barra de chips fija (sticky) con anclas a cada categoría.
  - Estado vacío si no hay productos.
- **NO cambia:** `ProductCard` (se reusa tal cual).
- **Comprobación:**
  - El conteo por categoría coincide con los productos visibles en el admin.
  - Una categoría oculta no aparece.
  - Cada chip hace scroll a su sección.

### E10 [EJECUCIÓN] Landing: detalle de producto con carrusel y "Agregar a mi cotización"
- **Archivo principal:** `apps/landing/src/pages/producto/[slug].astro`.
- **Secundario:** `src/lib/quote-list.ts` (nuevo).
- **Comportamiento nuevo:**
  - **Carrusel:**
    - Nativo: `scroll-snap-x` con un script vanilla.
    - Botones anterior/siguiente como `<button>` con `aria-label`, puntos indicadores y navegación con flechas del teclado.
    - Con 1 imagen no muestra controles; sin imágenes muestra el logo como placeholder.
  - **Info:** link a la categoría (`/catalogo#slug`), nombre, descripción (respeta saltos de línea) y aviso de entrega en Durango y días mínimos.
  - **Formulario:** stepper de cantidad (mín. 1), color de vela y color de listón (texto opcional) y aroma (checkbox, solo si `allowsFragrance`).
  - **`quote-list.ts`:**
    - read/add/update/remove/clear sobre `localStorage['lv.quote']`, con try/catch;
    - si se agrega el mismo producto con las mismas opciones, suma la cantidad;
    - emite el evento `quote:change` y actualiza el contador del header.
  - El slug inexistente muestra un 404 real con link al catálogo.
- **NO cambia:** el API y el layout, salvo engancharse al evento del contador.
- **Comprobación:**
  - Al agregar 2 productos, el contador marca 2.
  - Al recargar, la lista persiste.
  - El carrusel funciona con botones, teclado y swipe en móvil.
  - Un slug inexistente responde 404.

### E11 [EJECUCIÓN] Landing: "Mi cotización" y envío de la solicitud
- **Archivo principal:** `apps/landing/src/pages/cotizar.astro`.
- **Comportamiento nuevo:**
  - **Lista editable** desde `quote-list` (cantidad, quitar, opciones). Si está vacía, muestra un estado vacío con link al catálogo.
  - **Formulario:**
    - nombre;
    - WhatsApp (`inputmode=numeric`, `pattern=\d{10}`, `maxlength=10`);
    - fecha del evento con `<input type="date" min>`, calculado en el servidor como hoy + `minLeadTimeDays`;
    - notas;
    - honeypot `website` oculto (`tabindex=-1`, `autocomplete=off`).
  - **Avisos:** solo entregas en {city}, mínimo N días, y "te enviamos el precio por WhatsApp".
  - **Envío:**
    - hace POST a `/public/quote-requests` con el botón deshabilitado mientras envía;
    - los errores 400 del API se muestran en línea; un 429 muestra "Espera un minuto";
    - al terminar bien, vacía la lista y muestra la confirmación con el WhatsApp de la tienda.
- **NO cambia:** `quote-list.ts`, salvo que falte algo mínimo.
- **Comprobación:**
  - El flujo completo termina con la solicitud en la bandeja del admin (E5).
  - Una fecha menor al mínimo la bloquean tanto el input como el API.
  - Un doble clic no duplica la solicitud.

### E12 [EJECUCIÓN] Landing: cotización pública `/cotizacion/:token`
- **Archivo principal:** `apps/landing/src/pages/cotizacion/[token].astro`.
- **Comportamiento nuevo:** consume los endpoints que ya existen, `GET /public/quotations/:token` y `POST :token/accept|reject`.
  - Muestra folio, estado, vigencia, fecha del evento, renglones, subtotal, descuento, envío, total, anticipo, términos y notas.
  - Si el estado es SENT o VIEWED:
    - muestra los botones Aceptar y Rechazar, con `confirm()` nativo;
    - después de la acción recarga con el resultado;
    - si la acepta, se ve el folio del pedido, el anticipo a pagar y el CTA de WhatsApp.
  - Un token inválido responde 404.
  - Lleva `<meta name="robots" content="noindex">`.
- **NO cambia:** los endpoints públicos existentes.
- **Comprobación:**
  - Una cotización enviada desde el admin se abre con "copiar link público".
  - Aceptarla crea el pedido en el admin.
  - Un token inválido responde 404.

### E13 [EJECUCIÓN] Deploy en Railway
- **Archivo principal:** `.railway/railway.ts`.
- **Comportamiento nuevo:** servicio `@lignumvitae/landing`.
  - Build: `pnpm install --frozen-lockfile && pnpm --filter @lignumvitae/landing build`.
  - Start: `pnpm --filter @lignumvitae/landing start`.
  - Env: `PUBLIC_API_URL: preserve()`.
  - Se agrega a `resources`.
- **NO cambia:** los servicios de la API ni del admin.
- **Comprobación:** el build y el start locales escuchan en `PORT`.
- **Pasos manuales tuyos:**
  - En Railway, agregar el dominio de la landing a `CORS_ORIGINS` y a `PUBLIC_SITE_URL` de la API.
  - Definir `PUBLIC_API_URL` en la landing.

---

## Verificación de punta a punta (cuando termine E13)
1. `pnpm db:up && pnpm dev`.
2. Con Playwright, en la landing:
   - catálogo → producto → carrusel → agregar 2 productos → `/cotizar` → enviar.
3. En el admin, `/solicitudes`:
   - la solicitud aparece;
   - "Crear cotización" abre el formulario precargado;
   - dar de alta al cliente y guardar deja la solicitud CONVERTED.
4. Enviar la cotización, abrir su link público en la landing y aceptarla: el pedido aparece en el admin.
5. Revisar que la respuesta de `/api/public/*` no traiga ningún campo de costo.
6. Capturas a 375 px y a 1280 px.

## Notas
- Las fotos de `Galeria/` muestran nombres reales de clientas (p. ej. "Kenya, XV años"). Confirma que la dueña puede publicarlas.
- El texto de "Nosotros" queda provisional para que lo escriba la dueña.

**Riesgo más grande:** que el catálogo público deje ver costos y márgenes (hoy `GET /products` los manda completos) o que el POST público se llene de spam, porque el throttler no ve la IP real detrás de Railway. E1 y E2 van primero y se revisan línea por línea por esto.

---

## Bitácora de ejecución (2026-09-18)

| Paso | Quién | Notas |
|---|---|---|
| P1, P2 | Claude | Ganó Starbucks (24/25). `DESIGN.md` con mapeo y contraste AA. |
| E1–E6 | Claude | Codex llegó a su límite de uso. El mínimo de fecha se calcula con `Intl`, porque `common/utils/date.ts` truena al cargar (import de dayjs). Ese archivo no se tocó. |
| E7 | Codex + E7b | Colisión de nombres: `--color-heading` y `--text-heading` generan la misma clase `text-heading`. Los colores se renombraron a `brand` / `action`. |
| E8–E10 | Codex | Node no corre en el sandbox de Codex (assertion CSPRNG). Claude hizo los builds y la revisión visual. |
| E11–E13 | Claude | Codex llegó otra vez a su límite. Astro quita la `\` en `pattern="\d{10}"`: se usa `[0-9]{10}`. |

Pendientes que no bloquean:
- Carrusel: barra de scroll visible en escritorio y foto muy alta entre 768 y 1023 px.
- `common/utils/date.ts` está roto y nadie lo usa.
- La primera instalación dejó `@prisma/client` a medio instalar en `node_modules` local. Se reinstaló.
- Fotos de `Galeria/` con nombres de clientas: falta el permiso de la dueña.
- Texto de "Nosotros" provisional.
- En Railway:
  - agregar el dominio de la landing a `CORS_ORIGINS` y a `PUBLIC_SITE_URL` de la API;
  - definir `PUBLIC_API_URL` en la landing (también en build).
