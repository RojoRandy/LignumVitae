# Plan: SEO del landing, admin fuera de buscadores y preparación para agentes (is-agentic)

> Al aprobarse, este archivo se copia tal cual a `Plans/SEO/plan.md` (paso P0).

## Contexto

Objetivos: SEO de Lighthouse en 100 para el landing público (`lignumvitae.com.mx`), sacar de Google al portal
admin, y subir el puntaje de is-agentic, que hoy está en 52/100. Esto es lo que encontré en el código y en
producción:

- **Cloudflare** (NS tara/clark) da 403 a ClaudeBot y GPTBot y sirve su *managed robots.txt*, con
  `Disallow` para ClaudeBot, GPTBot y Google-Extended y líneas `Content-Signal`. Esas líneas hacen que
  Lighthouse marque el robots.txt como inválido. **Esto no se arregla con código** (paso M1).
- **Landing** (Astro 5.18 SSR, adapter node): `Layout.astro` solo pone `<title>`, `description` y
  `lang="es-MX"`. No tiene canonical, og:*, JSON-LD, sitemap, robots.txt propio, llms.txt, 404 propio,
  páginas /nosotros, /contacto ni /privacidad, ni negociación de Markdown.
- **API:** `SettingsService.getPublic()` no expone `legalName`, que el aviso de privacidad y el JSON-LD
  necesitan. `/public/catalog` no manda `updatedAt`, que el `lastmod` del sitemap necesita.
- **Admin** (Vite SPA): `index.html` no tiene description ni robots.

### Decisiones tomadas con el usuario
- Se deja pasar a **todos** los bots de IA, incluidos los de entrenamiento (ClaudeBot, GPTBot,
  Google-Extended).
- El admin lleva **noindex**. Lighthouse le marcará "bloqueado de indexación" solo a él, y es a propósito.
- Las páginas nuevas se enlazan **solo en el footer**. El menú conserva las anclas del home.
- Del **aviso de privacidad** Codex hace un borrador y el usuario o la dueña lo revisan antes de publicarlo.

### Decisiones de diseño
- **JSON-LD:** `Organization` + `WebSite` en todas las páginas, y `BreadcrumbList` en la ficha de producto.
  Sin `Product`: Google exige precio u oferta y aquí todo es por cotización.
- **noindex:** `/cotizar` y `/cotizacion/*` (esta última lleva tokens privados). El robots.txt bloquea solo
  `/cotizacion/`.
- **Markdown** en `/`, en `/llms.txt` y en los 404 cuando `Accept` prefiere `text/markdown` sobre
  `text/html`. `/` y `/llms.txt` comparten el mismo contenido. No se usa middleware: la página misma
  devuelve un `Response` desde su frontmatter.
- **Redirecciones 301:** `/about` → `/nosotros`, `/contact` → `/contacto` y `/privacy` → `/privacidad`,
  en `astro.config.mjs`.
- **Dominio fijo:** `site: 'https://lignumvitae.com.mx'`.
- **Pruebas:** `node:test` nativo (Node 24 ya quita los tipos TS solo). Sin dependencias nuevas.

## Archivos que se tocan

Existentes:
- `apps/api/src/modules/settings/settings.service.ts` (+ `settings.service.spec.ts`)
- `apps/api/src/modules/public/public-catalog.repository.ts` (+ `dto/public-catalog.dto.spec.ts`)
- `apps/landing/astro.config.mjs`, `apps/landing/package.json`
- `apps/landing/src/layouts/Layout.astro`
- `apps/landing/src/pages/index.astro`, `producto/[slug].astro`, `cotizar.astro`, `cotizacion/[token].astro`
- `apps/admin/index.html`

Nuevos (en `apps/landing/`):
- `src/lib/seo.ts` y `src/lib/seo.test.ts`
- `src/pages/robots.txt.ts`, `sitemap.xml.ts`, `llms.txt.ts`
- `src/pages/404.astro`, `nosotros.astro`, `contacto.astro`, `privacidad.astro`
- `src/components/ContactSection.astro`
- `scripts/check-agent-readiness.mjs`

Se reusan: `getJson`, `imageUrl` y `ApiError` de `apps/landing/src/lib/api.ts`; las clases existentes
(`site-container`, `button`, `text-*`); el cálculo de `whatsappUrl` que ya está en `index.astro`
(se mueve, no se duplica).

## Pasos

Los pasos E van a Codex (subagente `codex-rescue`) **uno por uno**. Reviso cada resultado y te lo resumo
en dos líneas antes del siguiente. Si uno vuelve incompleto o con errores, te aviso y espero.

Todos los encargos empiezan igual: "Lee `AGENTS.md`. No hagas commit ni push. No agregues dependencias
ni abstracciones. Si te atoras, dilo."

### P0 [PLAN] Preparación (yo)
Copiar este plan a `Plans/SEO/plan.md` y crear la rama `feat/seo-agentes` desde `main`.

### M1 [MANUAL, lo haces tú] Cloudflare → lignumvitae.com.mx
- En **AI Crawl Control / Bots**, desactiva "Block AI bots" para permitir todos los crawlers de IA.
- Desactiva **"Manage robots.txt"** (Content Signals). Así se sirve el robots.txt del paso E5.
- Revisa que **Bot Fight Mode** no dé 403 a los bots verificados.
- Compruébalo con `curl -A "ClaudeBot/1.0" -o /dev/null -w "%{http_code}" https://lignumvitae.com.mx/`, que debe dar 200.

### E1 [EJECUCIÓN] API: `legalName` en la config pública
- **Archivo:** `apps/api/src/modules/settings/settings.service.ts`.
- **Nuevo:** `getPublic()` también devuelve `legalName: s.legalName`.
- **NO cambia:** el resto de `getPublic` y los otros métodos. Sin endpoints nuevos.
- **Comprobación:** una prueba en `settings.service.spec.ts` que afirme que `getPublic()` trae
  `legalName` y **no** trae `dailyWage` ni `waxSupplyId`. `pnpm --filter @lignumvitae/api test` pasa.

### E2 [EJECUCIÓN] API: `updatedAt` por producto en `/public/catalog`
- **Archivo:** `apps/api/src/modules/public/public-catalog.repository.ts`.
- **Nuevo:** `updatedAt: true` en el `select` de `products` de `publicCatalogSelect`.
- **NO cambia:** los demás campos; `toPublicCatalogDto` se queda igual (ya hace spread).
- **Comprobación:** en `dto/public-catalog.dto.spec.ts`, fixture actualizado y aserción de que
  `updatedAt` sale en la respuesta. Los tests de la API pasan.

### E3 [EJECUCIÓN] Landing: helpers puros de SEO + pruebas
- **Archivos:** `src/lib/seo.ts` (nuevo), `src/lib/seo.test.ts` (nuevo), y en `package.json` el script
  `"test": "node --test src/lib/*.test.ts"`.
- **Nuevo:** funciones puras, sin imports de Astro. Los imports relativos llevan la extensión `.ts`.
  - `wantsMarkdown(accept: string | null)`: true si `text/markdown` tiene q>0 y q ≥ q de `text/html`
    (sin `text/html` en el header cuenta como 0). `*/*` no activa Markdown.
  - `siteMarkdown(settings, categories, origin)`: formato llms.txt.
    - `# {brandName}`, luego `> resumen`.
    - `## Cuándo usar este sitio`: velas personalizadas de recuerdo para XV años, bautizos, bodas y
      fechas especiales; entrega solo en {city}; al menos {minLeadTimeDays} días de anticipación.
      También cuándo **no** usarlo: envíos fuera de {city} o pedidos para hoy.
    - `## Cómo pedir`: /catalogo → /cotizar → WhatsApp. Aclarar que no hay API de pedidos.
    - `## Catálogo`: un enlace por producto, agrupado por categoría.
    - `## Contacto`.
    - `## Páginas`: nosotros, contacto, privacidad y sitemap.
  - `notFoundMarkdown(origin)`: al menos 20 caracteres, con enlaces a `/llms.txt` y `/sitemap.xml`.
  - `organizationJsonLd(settings, origin)`:
    - `@type: 'Organization'`, con name, legalName, url, `logo: origin + '/logo.svg'` y description.
    - `telephone` en E.164 +52, y email.
    - `address` PostalAddress (addressLocality, addressRegion, `addressCountry: 'MX'`).
    - `contactPoint` con contactType "customer service", telephone, email y availableLanguage "es".
    - `sameAs` con las redes que existan.
  - `websiteJsonLd(settings, origin)` y `breadcrumbJsonLd(items)`.
  - `jsonLdScript(data)`: JSON con `<` escapado como `\u003c`.
  - `sitemapXml(urls)`: escapa XML y pone `lastmod` en ISO 8601.
  - `robotsTxt(origin)`: `User-agent: *`, `Allow: /`, `Disallow: /cotizacion/` y la línea `Sitemap:`.
- **NO cambia:** ningún archivo existente fuera de `package.json`.
- **Comprobación:** `pnpm --filter @lignumvitae/landing test` pasa y cubre:
  - la negociación de Accept (markdown, html, `*/*`, q-values);
  - el escape en JSON-LD y en XML;
  - que el Organization trae contactPoint y address;
  - que llms.txt trae "Cuándo usar".

### E4 [EJECUCIÓN] Landing: metadatos globales
- **Archivo principal:** `src/layouts/Layout.astro`. **Secundario:** `astro.config.mjs` (`site` y
  `redirects`).
- **Nuevo:**
  - Props opcionales `image?: string` y `noindex?: boolean`.
  - En el `<head>`:
    - canonical (origin + pathname, sin query);
    - `og:type=website`, og:title, og:description, og:url, og:locale `es_MX` y og:site_name;
    - og:image, por defecto `/galeria/1.jpeg` (1600×1204), con su `og:image:alt`;
    - `twitter:card=summary_large_image`;
    - `<meta name="robots" content="noindex">` cuando `noindex`;
    - JSON-LD Organization + WebSite por medio de `jsonLdScript`.
  - `legalName` se agrega a la interfaz `PublicSettings` del Layout.
  - En el footer: enlaces a Nosotros, Contacto y Aviso de privacidad, con las mismas clases que los demás
    enlaces del footer.
- **NO cambia:** el header, el menú, el botón flotante, los estilos ni el orden visual.
- **Comprobación:** `pnpm --filter @lignumvitae/landing build` sin errores.

### E5 [EJECUCIÓN] Landing: archivos para máquinas
- **Archivos:** `src/pages/sitemap.xml.ts` (principal), `robots.txt.ts` y `llms.txt.ts`. Son endpoints
  `GET` que usan `seo.ts` + `getJson` y toman el origin de `context.site`.
- **Sitemap:** /, /catalogo, /nosotros, /contacto, /privacidad y `/producto/{slug}`.
  - `lastmod` = `updatedAt` del producto; las páginas fijas usan el más reciente.
  - Content-Type `application/xml; charset=utf-8`.
- **robots.txt:** `text/plain; charset=utf-8`.
- **llms.txt:** `text/markdown; charset=utf-8`.
- **NO cambia:** ninguna página.
- **Comprobación:** el build pasa.

### E6 [EJECUCIÓN] Landing: Markdown en el home
- **Archivo:** `src/pages/index.astro`, solo el frontmatter y después de los `getJson` que ya existen.
- **Nuevo:**
  - Si `wantsMarkdown(Astro.request.headers.get('accept'))`, se hace `return new Response(siteMarkdown(...), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' } })`.
  - Si no, `Astro.response.headers.set('Vary', 'Accept')`.
- **NO cambia:** el marcado ni el script del home.
- **Comprobación:** el build pasa.

### E7 [EJECUCIÓN] Landing: página 404
- **Archivo:** `src/pages/404.astro` (nuevo).
- **HTML:** usa el Layout, lleva un h1 "Página no encontrada" y enlaces a inicio y catálogo.
- **Markdown:** con `wantsMarkdown`, responde `new Response(notFoundMarkdown(origin), { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' } })`.
- **NO cambia:** el 404 de `/producto/[slug]`.
- **Comprobación:** el build pasa.

### E8 [EJECUCIÓN] Landing: `/contacto`
- **Archivos:** `src/components/ContactSection.astro` (nuevo) y `src/pages/contacto.astro` (nuevo).
- **Nuevo:**
  - La sección `#contacto` de `index.astro` se **mueve** tal cual al componente, que recibe `settings`
    y calcula su propio `whatsappUrl` y sus `socialLinks`. `index.astro` usa el componente.
  - `/contacto` lleva h1 y texto sobre zona de entrega, anticipación y cómo pedir (500 caracteres o
    más), y abajo el componente.
- **NO cambia:** cómo se ve el home. El HTML de la sección debe salir idéntico.
- **Comprobación:** el build pasa.

### E9 [EJECUCIÓN] Landing: `/nosotros`
- **Archivo:** `src/pages/nosotros.astro` (nuevo).
- **Nuevo:** un texto de 500 caracteres o más, armado con lo que ya dice el home (hecho a mano, las
  ocasiones, {city}, cómo funciona), y un CTA al catálogo. Lleva `<!-- TODO dueña -->`, igual que el home.
- **NO cambia:** la sección #nosotros del home.
- **Comprobación:** el build pasa.

### E10 [EJECUCIÓN] Landing: `/privacidad` (borrador)
- **Archivo:** `src/pages/privacidad.astro` (nuevo).
- **Nuevo:** aviso de privacidad (LFPDPPP) con:
  - responsable: `legalName`, en {city} y {state};
  - los datos que recaba el formulario de /cotizar: nombre, WhatsApp, fecha del evento, notas y productos;
  - las finalidades;
  - que no hay transferencias;
  - que los derechos ARCO se ejercen por el email de settings;
  - que se usa `localStorage` para la lista de cotización, sin cookies ni analítica;
  - la fecha de última actualización.
  
  Lleva `<!-- BORRADOR: revisión legal pendiente -->`.
- **NO cambia:** nada más.
- **Comprobación:** el build pasa.

### E11 [EJECUCIÓN] Admin fuera de los buscadores
- **Archivo:** `apps/admin/index.html`.
- **Nuevo:** `<meta name="description" content="Portal administrativo privado de Lignum Vitae.">` y
  `<meta name="robots" content="noindex, nofollow">`.
- **NO cambia:** los comentarios, las fuentes, el título ni `serve-static.mjs`.
- **Comprobación:** `pnpm --filter @lignumvitae/admin build` pasa y `dist/index.html` trae ambas meta.

### E12 [EJECUCIÓN] Script de verificación que se puede volver a correr
- **Archivo:** `apps/landing/scripts/check-agent-readiness.mjs` (nuevo, Node puro con `fetch`).
- **Nuevo:** recibe una URL base (por defecto `http://localhost:4321`) y revisa:
  - `/` con `Accept: text/markdown`: responde Markdown con `Vary: Accept`;
  - `/` con `Accept: text/html`: responde HTML con `Vary: Accept`;
  - un probe 404 con Accept markdown: status 404 y Content-Type `text/markdown`;
  - `/robots.txt`, `/sitemap.xml` y `/llms.txt`: status y Content-Type; llms.txt contiene "Cuándo usar";
  - el home tiene canonical, og:image, og:type, `lang`, y JSON-LD Organization con contactPoint y address;
  - /nosotros, /contacto y /privacidad responden 200;
  - con los UA de ClaudeBot, GPTBot, ChatGPT-User y Google-Extended, el status es 200.

  Imprime ✓/✗ por check y sale con código 1 si algo falla.
- **Comprobación:** yo lo corro contra local en la verificación final.

### E13 [EJECUCIÓN] Landing: metadatos por página (agregado durante la ejecución)
Se había caído de la lista de pasos aunque estaba en las decisiones de diseño.
- **Archivo principal:** `src/pages/producto/[slug].astro`. Pasa `image` = primera foto del producto
  (absoluta con `imageUrl`) y agrega `BreadcrumbList` (Inicio › Catálogo › Producto) por
  `<slot name="head">`.
- **Secundarios:** `cotizar.astro` y `cotizacion/[token].astro` pasan `noindex`.
- **NO cambia:** el contenido, los scripts ni el manejo del 404 de producto.
- **Comprobación:** el build pasa; en la revisión, con curl, se ven la foto en `og:image`, el
  BreadcrumbList y `noindex` en las dos páginas de cotización.

## Verificación final (la hago yo)
1. Levanto `pnpm db:up` y los servidores `api` y `landing` desde `.claude/launch.json`.
2. Corro `pnpm --filter @lignumvitae/api test` y `pnpm --filter @lignumvitae/landing test`.
3. Corro `node apps/landing/scripts/check-agent-readiness.mjs http://localhost:4321`.
4. Corro los curl del prompt de is-agentic, con `Accept: text/markdown` y `text/html`, sobre `/` y sobre
   el probe 404.
5. Valido el sitemap como XML y el JSON-LD del home y de una ficha de producto en validator.schema.org.
6. Corro Lighthouse (categoría SEO) sobre el home, el catálogo y una ficha en el browser local.
7. Tomo una captura del home y del footer para confirmar que el diseño no cambió.

Después del deploy (branch, PR y merge, solo si me lo pides) y de M1: script contra producción, PageSpeed
Insights e is-agentic.com.

## Fuera del código (punto 5 de is-agentic, que tu marca aparezca al buscarla)
- **Google Search Console:** verifica el dominio con un registro TXT en Cloudflare y envía `/sitemap.xml`.
- **Bing Webmaster Tools:** importa desde Search Console.
- **Google Business Profile:** con los mismos datos de nombre, teléfono y ciudad.
- **Redes:** que Instagram, Facebook y TikTok enlacen a `https://lignumvitae.com.mx`.

## Sitios para medir el SEO
PageSpeed Insights (Lighthouse SEO), Google Search Console, Rich Results Test, validator.schema.org,
Bing Webmaster Tools, Ahrefs Webmaster Tools, Seobility, opengraph.xyz, is-agentic.com y acceptmarkdown.com.

## Riesgo más grande
Si no se hace M1 en Cloudflare, los bots de IA siguen recibiendo 403 y el robots.txt administrado sigue
siendo inválido para Lighthouse, aunque todo el código quede bien.
