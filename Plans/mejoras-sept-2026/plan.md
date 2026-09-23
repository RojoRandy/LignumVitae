# Plan: debounce, PDF en producción, favicons, borrado de solicitudes/cotizaciones y filtros del catálogo

## Contexto

Son seis mejoras chicas. Revisé el código y los logs de Railway, y esto es lo que encontré:

- **Búsquedas del admin.** `useTableParams` ya espera 300 ms antes de actualizar la URL, pero las 11 páginas
  hacen la consulta con el texto **sin espera** (`search` es el estado local). Resultado: sale un GET
  por cada tecla, y además con la página vieja. El landing no tiene buscador de texto.
- **PDF en producción.** No falta ninguna variable de la app. El log de Railway dice:
  `Could not find Chrome (ver. 148…) … cache path … /root/.cache/puppeteer`. Railpack sí instala las
  librerías del sistema para Chrome, pero Puppeteer descarga Chrome en `/root/.cache`, y esa carpeta no
  pasa a la imagen final. **La variable que falta es `PUPPETEER_CACHE_DIR`**, apuntando dentro de `/app`.
- **Favicons.** El `favicon.svg` del admin tiene la insignia chiquita y descentrada: el viewBox mide
  500×500 y el círculo solo ocupa 325. El landing no tiene favicon (pide `/favicon.ico` y recibe 404).
  El archivo `apps/landing/public/logo.svg` ya es el logo circular bien recortado.
- **Borrado.** `QuoteRequest` y `Quotation` ya tienen `isActive`, y los listados ya filtran
  `onlyActive`, así que no hace falta migración. Reusamos el patrón que ya tiene Productos
  (`DELETE :id` para la baja y `DELETE :id/permanent`, solo para admin y super_user).
- **Catálogo del landing.** Los filtros se hacen en el cliente con `data-*` en cada tarjeta. El producto
  tiene `packagingType` (con `name` y `slug`), pero el endpoint público todavía no lo manda.

**Lo que decidiste:**
- El borrado permanente solo aplica a lo que ya está dado de baja, igual que en Productos.
- Una cotización que ya tiene pedido no se puede borrar de ninguna forma. Se responde con el error que ya existe, `QUOTATION_ALREADY_CONVERTED` (409).
- Si se borra para siempre una cotización que salió de una solicitud web, esa solicitud vuelve a `NEW` y su `convertedQuotationId` queda en `null`.

**Lo que dejé fuera a propósito:** los PNG y el apple-touch-icon. Se agregan si Safari no muestra el SVG.
Tampoco regenero `openapi-schema.d.ts`, porque el admin y el landing usan tipos escritos a mano.

---

## Archivos que se van a tocar (rutas completas)

- `/Users/randyrojo/Developer/LignumVitae/.railway/railway.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/admin/public/favicon.svg`
- `/Users/randyrojo/Developer/LignumVitae/apps/landing/src/layouts/Layout.astro`
- `/Users/randyrojo/Developer/LignumVitae/apps/admin/src/components/ui/page.tsx`
- `/Users/randyrojo/Developer/LignumVitae/apps/admin/src/hooks/use-table-params.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/public/public-catalog.repository.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/landing/src/pages/catalogo.astro`
- `/Users/randyrojo/Developer/LignumVitae/apps/landing/src/components/ProductCard.astro`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/common/errors/sales.errors.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quote-requests/quote-requests.controller.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quote-requests/quote-requests.service.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quote-requests/quote-request.repository.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quote-requests/quote-requests.service.spec.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quotations/quotations.controller.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quotations/quotations.service.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quotations/quotation.repository.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/api/src/modules/sales/quotations/quotations.service.spec.ts` (nuevo)
- `/Users/randyrojo/Developer/LignumVitae/apps/admin/src/lib/types.ts`
- `/Users/randyrojo/Developer/LignumVitae/apps/admin/src/features/quote-requests/QuoteRequestsPage.tsx`
- `/Users/randyrojo/Developer/LignumVitae/apps/admin/src/features/quotations/QuotationDetailPage.tsx`
- `/Users/randyrojo/Developer/LignumVitae/apps/admin/src/features/quotations/QuotationsPage.tsx`

Código que se reusa: `ProductsService.deactivate/deletePermanently`
(`apps/api/src/modules/catalog/products/products.service.ts:235`), que es el patrón de baja y borrado.
También `PageToolbar.showInactive` (`apps/admin/src/components/ui/page.tsx`), `useTableParams().onlyActive/setOnlyActive`,
`useConfirm` y `SalesErrors.QUOTATION_ALREADY_CONVERTED`.

---

## Pasos

Todos los encargos a Codex empiezan igual:
*"Lee `AGENTS.md` antes de tocar nada. No hagas commit ni push. No agregues dependencias ni abstracciones.
Si algo no está claro, dilo en vez de improvisar. Al terminar reporta: archivos tocados, las comprobaciones
que corriste con su resultado literal, y lo que no pudiste comprobar."*

### P0 [PLAN] Diagnóstico y reglas (hecho)
La causa del PDF está confirmada en los logs. Las reglas de borrado ya las decidiste (ver Contexto).
Si apruebas, copio este plan a `Plans/mejoras-sept-2026/plan.md`, como los anteriores.

### E1 [EJECUCIÓN] Arreglar el PDF en producción
- **Archivo:** `.railway/railway.ts`, servicio `@lignumvitae/api`.
- **Comportamiento nuevo:**
  - En `env` se agrega `PUPPETEER_CACHE_DIR: "/app/.cache/puppeteer"`. Va como valor literal, no con `preserve()`, porque la variable todavía no existe en Railway.
  - En `build`, antes de `&& test -f apps/api/dist/main.js`, se agrega `&& pnpm --filter @lignumvitae/api exec puppeteer browsers install chrome`. Así Chrome se descarga dentro de `/app` aunque falle el postinstall.
- **NO cambia:**
  - Las variables que ya existen, que siguen con `preserve()`, incluidas las de S3.
  - El `start` y los servicios admin, landing y postgres.
  - `pdf.service.ts`: Puppeteer lee `PUPPETEER_CACHE_DIR` solo.
- **Comprobación:**
  - `railway config plan` (solo lectura) muestra únicamente el cambio de `build` y la variable nueva, sin borrar nada.
  - `pnpm --filter @lignumvitae/api build` pasa.

### M1 [Paso manual, no va a Codex] Aplicar en Railway
Tú corres `railway config apply`, o lo corro yo si me lo confirmas en ese momento. Eso dispara el redeploy del API.
Después se descarga un PDF desde el admin de producción y se revisa `railway logs --service @lignumvitae/api`.
**Plan B**, si sigue sin encontrar Chrome: instalar Chromium del sistema con `RAILPACK_DEPLOY_APT_PACKAGES=chromium`
y `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.

### E2 [EJECUCIÓN] Favicons con el logo circular
- **Archivo principal:** `apps/landing/src/layouts/Layout.astro`. **Secundario:** `apps/admin/public/favicon.svg`.
- **Comportamiento nuevo:**
  - `apps/admin/public/favicon.svg` pasa a ser una copia byte a byte de `apps/landing/public/logo.svg`: la insignia circular recortada y centrada. `index.html` del admin no se toca, porque ya apunta a `/favicon.svg`.
  - En `Layout.astro`, dentro de `<head>`, se agrega `<link rel="icon" type="image/svg+xml" href="/logo.svg" />`.
- **NO cambia:** los logos que se ven en el header o en el login, el resto del `<head>`, y los archivos `logo.svg` y `logo-texto.svg`.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/admin build` y `pnpm --filter @lignumvitae/landing build` pasan.
  - `diff apps/admin/public/favicon.svg apps/landing/public/logo.svg` no muestra diferencias.
  - Con los dos dev servers arriba, la pestaña de cada app muestra la insignia centrada, y `/logo.svg` responde 200.

### E3 [EJECUCIÓN] Debounce real en las búsquedas del admin
- **Archivo principal:** `apps/admin/src/components/ui/page.tsx`. **Secundario:** `apps/admin/src/hooks/use-table-params.ts`.
- **Comportamiento nuevo:**
  - En `page.tsx` hay un componente interno `SearchInput` con estado local del texto. Llama `search.onChange(texto)` 300 ms después de la última tecla, y solo si el texto cambió. `PageToolbar` lo usa en lugar del `<Input>` de ahora, con la misma apariencia, ícono y aria-label. El comentario de `PageToolbarProps` se actualiza: el debounce ahora vive aquí.
  - En `use-table-params.ts`, `search` pasa a ser el valor de la URL, que ya llega con el debounce aplicado. `setSearch(value)` escribe la URL de inmediato: pone o borra `search` y regresa `page` a 1. Se eliminan el `useState` y el `useEffect` del debounce, y se actualiza el comentario de arriba.
- **NO cambia:**
  - Las 11 páginas que usan `search={{ value: search, onChange: setSearch }}`, que no se tocan.
  - Lo que devuelve el hook: `{ page, search, setSearch, onlyActive, setOnlyActive, setPage }`.
  - El `Select` con buscador, que filtra en el cliente, y el preview de totales, que ya tiene debounce.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/admin build` y `pnpm --filter @lignumvitae/admin lint` pasan.
  - En el navegador, en Productos, escribir "vela" rápido dispara **un solo** `GET /api/products?...search=vela&page=1`, no cuatro.
  - La URL queda con `?search=vela&page=1`, y al recargar se conserva el filtro.
  - Al borrar el texto vuelve la lista completa.

### E4 [EJECUCIÓN] API: el catálogo público manda el empaque
- **Archivo:** `apps/api/src/modules/public/public-catalog.repository.ts`.
- **Comportamiento nuevo:** en `publicCatalogSelect.products.select` se agrega `packagingType: { select: { name: true, slug: true } }`. El mapper `toPublicCatalogDto` ya lo deja pasar con el spread.
- **NO cambia:** los otros campos del select, `publicProductSelect`, las demás consultas y el controller.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/api build` y `pnpm --filter @lignumvitae/api test` pasan.
  - `curl localhost:3000/api/public/catalog` trae `packagingType: {name, slug}` o `null` en cada producto.
  - Buscar `cost|price|margin|suppl` en la respuesta no encuentra nada.

### E5 [EJECUCIÓN] Landing: los filtros siguen a la categoría, más un filtro de empaque
- **Archivo principal:** `apps/landing/src/pages/catalogo.astro`. **Secundario:** `apps/landing/src/components/ProductCard.astro`.
- **Comportamiento nuevo:**
  - En `ProductCard.astro`, la interfaz `Product` suma `packagingType?: { name: string; slug: string } | null`, y la tarjeta lleva `data-packaging={slug ?? ''}`.
  - En el frontmatter de `catalogo.astro`, cada molde de `candleFacets` guarda también los slugs de las categorías donde aparece. Se arma `packagingFacets` de la misma forma, deduplicado por slug y ordenado por nombre en `es`.
  - Se agrega un fieldset **"Empaque"**, debajo de "Molde", con checkboxes `data-filter-packaging`. Solo se muestra si hay al menos un empaque.
  - Cada `<label>` de molde y de empaque lleva `data-facet-categories="a,b"`.
  - En `applyFilters`, lo primero: si hay categorías marcadas, se ocultan las opciones de Molde y Empaque que no aparecen en ninguna de ellas, y **se desmarcan** las que queden ocultas. Si todas las opciones de un fieldset quedan ocultas, el fieldset también se oculta. Sin categorías marcadas, todo se ve como hoy.
  - Después, la tarjeta se ve si cumple categoría **y** molde **y** empaque, con la misma lógica que molde.
  - "Limpiar filtros" también desmarca los empaques, y `anyFilter` los toma en cuenta.
- **NO cambia:** los chips de categoría, el deep link `/catalogo#slug`, la lógica de ocultar secciones, el estado vacío, los estilos y el layout en móvil y escritorio.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/landing build` pasa.
  - Con el API y el landing locales, en `/catalogo`:
    - Al marcar una categoría, en "Molde" solo quedan los moldes de esa categoría.
    - Si antes había un molde marcado de otra categoría, se desmarca.
    - Al marcar un empaque, solo quedan las tarjetas con ese empaque.
    - "Limpiar" regresa todo.
    - A 375 px de ancho no hay scroll horizontal.

### E6 [EJECUCIÓN] API: baja, restauración y borrado permanente de solicitudes
- **Archivo principal:** `quote-requests.service.ts`. **Secundarios:** `quote-requests.controller.ts`, `quote-request.repository.ts`, `common/errors/sales.errors.ts`, `quote-requests.service.spec.ts`.
- **Comportamiento nuevo:**
  - Error nuevo en `sales.errors.ts`: `MUST_BE_INACTIVE`, que responde 400 con "Da de baja el registro antes de eliminarlo permanentemente". Va en `Responses` y en `Exceptions`.
  - Endpoints nuevos, cada uno con `@Auth(UserRoles.admin, UserRoles.super_user)` como en customers y products:
    - `DELETE /quote-requests/:id`: `isActive=false`, en cualquier estado.
    - `POST /quote-requests/:id/restore`: `isActive=true`.
    - `DELETE /quote-requests/:id/permanent`: si la solicitud está activa, lanza `MUST_BE_INACTIVE`; si no, la borra de la tabla.
  - Los tres responden 404 si no existe, usando el `findById` que ya hay.
  - En el repository se agregan `setActive(id, isActive)` y `delete(id)`.
- **NO cambia:** `dismiss`, `createFromWeb`, `findAll` (ya filtra `onlyActive`), el endpoint público y el schema. No hay migración.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/api build` y `pnpm --filter @lignumvitae/api test` pasan.
  - En el spec hay dos casos nuevos: borrar para siempre una solicitud activa lanza `MUST_BE_INACTIVE`, y una inactiva llama a `delete`.
  - Con curl:
    - Después de DELETE, desaparece de `GET /quote-requests` y aparece con `?onlyActive=false`.
    - restore la regresa.
    - permanent sobre una activa responde 400.
    - Después de la baja, permanent responde 200 y el `GET /:id` da 404.

### E7 [EJECUCIÓN] API: baja, restauración y borrado permanente de cotizaciones
- **Archivo principal:** `quotations.service.ts`. **Secundarios:** `quotations.controller.ts`, `quotation.repository.ts` y `quotations.service.spec.ts` (nuevo).
- **Comportamiento nuevo:** los mismos tres endpoints con los mismos roles: `DELETE /quotations/:id`, `POST /quotations/:id/restore` y `DELETE /quotations/:id/permanent`.
  - **Baja:** si la cotización tiene `order`, lanza `QUOTATION_ALREADY_CONVERTED` (409). Si no, pone `isActive=false`. Con eso su enlace público deja de funcionar, porque `findByPublicToken` ya exige que esté activa.
  - **Borrado permanente:** si está activa, lanza `MUST_BE_INACTIVE`. Si tiene pedido, lanza `QUOTATION_ALREADY_CONVERTED`. Si pasa las dos revisiones, en **una sola transacción**:
    - `quoteRequest.updateMany({ where: { convertedQuotationId: id }, data: { status: 'NEW', convertedQuotationId: null } })`
    - `quotation.delete({ where: { id } })`. Los renglones se borran en cascada.
  - En el repository se agregan `setActive` y `deletePermanently`, este último con `$transaction`.
- **NO cambia:** create, update, send, reject, duplicate, el PDF, `expireOverdue`, el contador de folios (quedan huecos y está bien), el schema y los pedidos.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/api build` y `pnpm --filter @lignumvitae/api test` pasan.
  - El spec nuevo cubre tres casos: activa → `MUST_BE_INACTIVE`; con pedido → `QUOTATION_ALREADY_CONVERTED`; inactiva y sin pedido → llama a `deletePermanently`.
  - Con curl:
    - Tras la baja, `GET /api/public/quotations/:token` da 404.
    - Borrar para siempre una cotización que salió de una solicitud deja esa solicitud en `NEW` con `convertedQuotationId: null`.
    - Borrar una cotización con pedido responde 409.

### E8 [EJECUCIÓN] Admin: borrar solicitudes web
- **Archivo principal:** `apps/admin/src/features/quote-requests/QuoteRequestsPage.tsx`. **Secundario:** `apps/admin/src/lib/types.ts`, donde `QuoteRequestDto` suma `isActive: boolean`.
- **Comportamiento nuevo:**
  - `PageToolbar` suma `showInactive`, conectado a `onlyActive` y `setOnlyActive` de `useTableParams`. La query manda `onlyActive` y lo incluye en su `queryKey`.
  - En el Sheet de detalle:
    - Si la solicitud está activa: botón "Eliminar" (ghost, rojo, con `confirm`) que llama `DELETE` y la da de baja.
    - Si está inactiva: badge "Dada de baja", y los botones "Restaurar" y "Eliminar permanentemente" (con `confirm` rojo que avisa que no se puede deshacer). En este caso se esconden "Crear cotización" y "Descartar".
  - Al terminar cualquier acción: toast, invalidar `['quote-requests']` y cerrar el Sheet, igual que `dismiss`.
- **NO cambia:** las columnas, el filtro de estado, el flujo de descartar y el de "Crear cotización" en solicitudes activas.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/admin build` y `pnpm --filter @lignumvitae/admin lint` pasan.
  - En el navegador:
    - Al eliminar, la solicitud desaparece.
    - Con "Mostrar dados de baja" vuelve a aparecer con su badge.
    - Restaurar la regresa.
    - Eliminar permanentemente la quita para siempre.

### E9 [EJECUCIÓN] Admin: borrar cotizaciones
- **Archivo principal:** `apps/admin/src/features/quotations/QuotationDetailPage.tsx`. **Secundario:** `QuotationsPage.tsx`.
- **Comportamiento nuevo:**
  - En el menú "Más acciones" del detalle, si está activa y **sin pedido**: se agrega "Dar de baja" (rojo, con `confirm`) después de un separador.
  - Si está inactiva:
    - Badge "Dada de baja" junto al de estado.
    - Acciones "Restaurar" y "Eliminar permanentemente" (con `confirm` rojo).
    - Se esconden "Enviar", "Aceptar y crear pedido", "Editar" y "Rechazar".
  - Al eliminar para siempre: invalidar `['quotations']` y `['quote-requests']`, y navegar a `/cotizaciones`.
  - En `QuotationsPage.tsx`: `showInactive` conectado a `useTableParams`, `onlyActive` en la query y en la `queryKey`, y un badge "Baja" en las filas inactivas.
- **NO cambia:** descargar PDF, copiar enlace, duplicar, los estados y el flujo de aceptar y rechazar en cotizaciones activas.
- **Comprobación:**
  - `pnpm --filter @lignumvitae/admin build` y `pnpm --filter @lignumvitae/admin lint` pasan.
  - En el navegador:
    - Una cotización con pedido no ofrece "Dar de baja".
    - Una en borrador se da de baja, aparece con el toggle y se restaura.
    - Una que salió de una solicitud, al eliminarla para siempre, deja la solicitud otra vez en "Nueva" con "Crear cotización" disponible.

---

## Verificación final (la hago yo)
- Reviso el diff de cada paso que regrese de Codex antes de pasar al siguiente.
- Al final corro `pnpm build` y `pnpm test` en la raíz.
- Hago una pasada rápida en el navegador por el admin (búsqueda, borrado) y por el landing (`/catalogo` y el favicon).
- El PDF se comprueba solo en Railway, después de M1.

**Riesgo más grande:** el arreglo del PDF solo se puede comprobar ya desplegado en Railway. Si Railpack tampoco copia `/app/.cache` a la imagen final, hay que pasar al plan B con el Chromium del sistema.
