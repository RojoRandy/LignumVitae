# Plan: ajustes de insumos, productos, cotización, clientes y compras

## Contexto

El portal admin ya está completo de punta a punta, pero seis zonas tienen fricción real
de captura y tres bugs que bloquean trabajo diario: no se puede descargar el PDF de una
cotización, no se puede registrar una compra con insumo + molde, y el costo de cera sale
siempre en cero. Además, el catálogo de tipos de insumo y unidades de medida vive
hardcodeado como enums de Postgres, así que dar de alta un insumo nuevo con un tipo que
no existe obliga a una migración.

El resultado buscado: que la captura diaria (insumo, compra, producto, cotización) se
haga sin salir del portal y sin números en cero silenciosos.

**Decisiones ya tomadas:**
- Tipos de insumo **y** unidades de medida pasan a ser tablas reales con CRUD.
- Editar cotización: sólo borradores (falta el botón; la API ya lo soporta).
- **Pedidos queda fuera del plan.** Si hace falta agregar productos, se hace una
  cotización y un pedido nuevos.
- Editar compra = cancelar la vieja y recrear, no un diff de renglones.

**Supuesto fijado:** cuando un "precio manual" rompe el piso de margen de Configuración,
se **sigue bloqueando**, pero ahora el error se ve en pantalla al momento (hoy se traga y
parece que "no recalcula"). Si se quiere saltar, se baja `minMarginPct` en Configuración.

---

## Archivos que se van a tocar

**API — `apps/api/`**
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/` (migración nueva)
- `src/modules/inventory/supplies/` (dto, service, repository)
- `src/modules/inventory/supply-types/`, `src/modules/inventory/units-of-measure/` (nuevos)
- `src/modules/inventory/inventory.module.ts`
- `src/modules/inventory/purchases/dto/create-purchase.dto.ts`, `purchases.service.ts`, `purchases.controller.ts`
- `src/modules/catalog/products/products.service.ts`, `services/product-costing-calculator.service.ts`
- `src/modules/catalog/products/dto/create-product.dto.ts`
- `src/modules/catalog/candles/`, `packaging-types/`, `card-types/` (adaptación a FK)
- `src/modules/sales/customers/dto/create-customer.dto.ts`
- `src/common/errors/inventory.errors.ts`

**Admin — `apps/admin/src/`**
- `lib/types.ts`, `lib/http.ts`
- `hooks/use-supply-options.ts`, `hooks/use-customer-options.ts`, hooks nuevos de catálogos
- `features/supplies/SuppliesPage.tsx`
- `features/supply-types/SupplyTypesPage.tsx`, `features/units/UnitsPage.tsx` (nuevos)
- `features/purchases/PurchasesPage.tsx`
- `features/products/ProductWizardPage.tsx`, `features/products/components/cost-preview-panel.tsx`
- `features/candles/CandlesPage.tsx`, `components/domain/supply-template-editor.tsx`
- `features/settings/SettingsPage.tsx`
- `features/quotations/QuotationFormPage.tsx`, `QuotationDetailPage.tsx`,
  `components/quotation-line-item-editor.tsx`, `use-quotation-totals-preview.ts`
- `features/customers/CustomersPage.tsx`, `features/customers/quick-create-dialog.tsx` (nuevo)
- `components/layout/AppLayout.tsx`, `App.tsx`

**Compartido — `packages/types/src/`**
- `costing/product-cost.ts` (sólo si el aviso de cera lo pide), `client/openapi-schema.d.ts` (regenerado)

---

## Bloque A — Tipos de insumo y unidades de medida como tablas

Hoy son `enum SupplyType` (17 valores) y `enum UnitOfMeasure` (8) en
`schema.prisma:399-434`, usados en `Supply.type`, `Supply.unit`, `ProductSupply.unit`,
`CandleSupplyTemplate.unit` y las plantillas de empaque/tarjeta. El código depende
semánticamente de dos valores: `WAX` (excluido de los BOM) y `FRAGRANCE` (el aroma).

### A1 · [PLAN] Diseñar el modelo de los dos catálogos — *Claude*
Define: campos de cada tabla (`id`, `slug` único, `name`, `sortOrder`, `isSystem`,
`isActive`; las unidades además `abbr`), qué filas nacen como `isSystem` (las 17 + 8
actuales), qué protege `isSystem` (no se borra, no se le cambia el `slug`; el nombre
visible sí se edita), y la lista exacta de columnas que pasan de enum a FK. Entrega la
tabla de mapeo enum→slug que Codex usará en el backfill.

### A2 · [EJECUCIÓN] Prisma: modelos nuevos y migración con backfill
**Encargo a Codex**
- **Archivo principal:** `apps/api/prisma/schema.prisma` + una migración nueva en
  `apps/api/prisma/migrations/`. Secundario: `apps/api/prisma/seed.ts`.
- **Comportamiento nuevo:** existen los modelos `SupplyType` y `UnitOfMeasure` (schema
  `inventory`) con los campos que define A1. Las columnas `Supply.type`, `Supply.unit`,
  `ProductSupply.unit`, `CandleSupplyTemplate.unit` y las `unit` de las plantillas de
  empaque y tarjeta pasan de enum a FK `Int`. La migración **siembra las 17 filas de tipo
  y las 8 de unidad con su slug actual y `isSystem: true`, y hace el backfill de cada
  fila existente por slug antes de soltar los enums** — ninguna fila puede quedar sin
  tipo o sin unidad. El seed deja de escribir literales de enum y busca por slug.
- **NO debe cambiar:** ningún cálculo de costeo, ni las tablas de ventas, ni los nombres
  de las columnas fuera de las listadas. No borrar datos existentes. No agregar
  conversión entre unidades (hoy no existe y no es parte de este plan).
- **Comprobación:** `pnpm db:reset && pnpm db:seed` corre limpio; sobre una base con datos
  previos, `pnpm db:migrate` deja `SELECT count(*) FROM inventory.supplies WHERE type_id IS NULL`
  en 0; `pnpm --filter @lignumvitae/api build` compila.

### A3 · [EJECUCIÓN] API: adaptar todo lo que hoy compara enums
**Encargo a Codex**
- **Archivo principal:** `apps/api/src/modules/inventory/supplies/` (dto, service,
  repository). Secundarios: los módulos de catálogo y compras que incluyan `unit`/`type`.
- **Comportamiento nuevo:** los DTO aceptan `typeId` / `unitId` en vez de los enums; los
  `include` de Prisma traen el tipo y la unidad para que el front siga recibiendo nombre y
  abreviatura; todo lugar que hoy comparaba `type === 'WAX'` o `'FRAGRANCE'` ahora compara
  `type.slug`. El filtro `GET /supplies?type=` sigue funcionando, ahora por slug.
- **NO debe cambiar:** la forma de las respuestas más allá de `type`/`unit` (que pasan de
  string a objeto `{id, slug, name, abbr}`); el motor de costeo de `packages/types`; los
  endpoints existentes ni sus rutas.
- **Comprobación:** `pnpm --filter @lignumvitae/api build` y `pnpm --filter @lignumvitae/api test`
  en verde; `GET /api/supplies` devuelve el tipo y la unidad anidados.

### A4 · [EJECUCIÓN] API: dos módulos CRUD nuevos
**Encargo a Codex**
- **Archivo principal:** `apps/api/src/modules/inventory/supply-types/` y
  `.../units-of-measure/` (nuevos). Secundario: `inventory.module.ts`,
  `common/errors/inventory.errors.ts`.
- **Comportamiento nuevo:** CRUD calcado de
  `apps/api/src/modules/catalog/card-types/` (controller + service + repository + dto +
  module, mismo estilo y misma paginación). Reglas: no se puede borrar un catálogo con
  insumos vivos usándolo (error `HAS_DEPENDENTS`, como ya hace `supplies.service.ts:63-70`);
  no se puede borrar ni cambiar el slug de una fila `isSystem`; el nombre visible sí.
  POST/PATCH/DELETE restringidos a `admin` y `super_user`.
- **NO debe cambiar:** el módulo de card-types que sirve de molde. Sin abstracción
  compartida entre los dos módulos nuevos: son dos copias del patrón que ya existe.
- **Comprobación:** crear un tipo nuevo por API, darlo de alta en un insumo, intentar
  borrarlo → 400 con `HAS_DEPENDENTS`; intentar borrar `WAX` → 400.

### A5 · [EJECUCIÓN] Admin: dejar de hardcodear tipos y unidades
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/hooks/` (dos hooks nuevos al estilo de
  `use-supply-options.ts`). Secundarios: `lib/types.ts`, `features/supplies/SuppliesPage.tsx:23-52`,
  `features/purchases/PurchasesPage.tsx:46-48`, `components/domain/supply-template-editor.tsx`.
- **Comportamiento nuevo:** las constantes `SUPPLY_TYPES`, `UNITS` y `UNIT_ABBR`
  desaparecen; los selects y las abreviaturas salen de los nuevos endpoints. Los tipos de
  `lib/types.ts` reflejan el objeto anidado. `useSupplyOptions` filtra la cera por
  `type.slug === 'WAX'`.
- **NO debe cambiar:** la apariencia de ningún select, ni el orden en que se muestran los
  tipos (se respeta `sortOrder`). Sin dependencias nuevas.
- **Comprobación:** `pnpm --filter @lignumvitae/admin build`; el alta de insumo y el
  renglón de compra muestran las mismas opciones y abreviaturas que hoy.

### A6 · [EJECUCIÓN] Admin: la sección para administrarlos
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/supply-types/SupplyTypesPage.tsx` y
  `features/units/UnitsPage.tsx` (nuevos). Secundarios: `App.tsx:55-75`, `components/layout/nav.ts`.
- **Comportamiento nuevo:** dos pestañas más dentro de `/catalogo` ("Tipos de insumo" y
  "Unidades de medida"), cada una calcada de
  `apps/admin/src/features/card-types/CardTypesPage.tsx` (tabla + diálogo de alta/edición +
  dar de baja). Las filas de sistema muestran su badge y no ofrecen "Dar de baja".
- **NO debe cambiar:** las cuatro pestañas que ya viven en `/catalogo`, ni el layout de
  `TabsPageLayout`. Se usan `PageToolbar`, `DataTable`, `Dialog` y `Field` existentes, sin
  encabezado propio.
- **Comprobación:** en `/catalogo/tipos-insumo` crear un tipo, usarlo en un insumo nuevo y
  verlo en el listado de insumos; `pnpm --filter @lignumvitae/admin e2e` sigue en verde.

---

## Bloque B — Formulario de insumo

### B1 · [EJECUCIÓN] Reordenar, renombrar y quitar "Como se compra"
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/supplies/SuppliesPage.tsx:210-265`.
  Secundarios: `apps/api/src/modules/inventory/supplies/dto/create-supply.dto.ts:42-45`,
  `apps/admin/src/lib/types.ts`.
- **Comportamiento nuevo:** el diálogo queda en este orden exacto — Nombre, Tipo,
  **Unidad de medida** (antes "Unidad base"), Costo actual, **Contenido por unidad**
  (antes "Unidades base por paquete", mismo campo `defaultBaseQtyPerPack`), Existencia
  mínima, Notas. El campo "Como se compra" (`defaultPackLabel`) se elimina del formulario,
  del payload y del DTO de la API.
- **NO debe cambiar:** los nombres de las columnas en Prisma —`defaultPackLabel` se queda
  en la base como columna huérfana, sin migración, porque es dato muerto que no participa
  en ningún cálculo (`schema.prisma:457-458` lo dice explícito). Tampoco cambia el
  `tooltip` de "Costo actual" ni la lógica de guardado.
- **Comprobación:** alta y edición de un insumo guardan bien; en Red del navegador el
  payload ya no lleva `defaultPackLabel`; enviar ese campo a la API devuelve 400 por
  `forbidNonWhitelisted`.

---

## Bloque C — Productos

### C1 · [PLAN] Cómo se ve la herencia de insumos en el producto — *Claude*
Hoy el servidor **sí** hereda los insumos de la vela, el empaque y la tarjeta
(`products.service.ts:215-251`), pero el asistente de producto no los muestra: por eso se
sienten "duplicados". Se decide cómo se presentan (bloque de sólo lectura, agrupado por
origen) y qué pasa si alguien agrega como adicional un insumo que ya viene heredado.

### C2 · [EJECUCIÓN] API: cerrar los huecos de herencia
**Encargo a Codex**
- **Archivo principal:** `apps/api/src/modules/catalog/products/products.service.ts`.
- **Comportamiento nuevo:** (1) un producto BOUQUET hereda la plantilla de insumos de cada
  vela que lo compone —hoy `:218` la salta y esos insumos no se cobran en ningún lado;
  (2) `update()` (`:141-146`) deja de perder los insumos manuales cuando se cambia empaque,
  tarjeta o vela sin reenviarlos: los relee de la base como ya hace `reapplyTemplates()`
  (`:153-162`); (3) se rechaza un insumo de tipo cera dentro de `additionalSupplies`, con
  el error `SUPPLY_IS_WAX` que ya está definido en `common/errors/inventory.errors.ts:6-11`
  y nunca se lanza.
- **NO debe cambiar:** la deduplicación por `supplyId` ni la precedencia actual (gana el
  último); el cálculo de costo de productos SIMPLE.
- **Comprobación:** crear un ramo con dos velas que tengan mecha en su plantilla y ver que
  `unitSupplyCost` ya no es cero; editar el empaque de un producto con insumos manuales y
  confirmar que siguen ahí; mandar un insumo de cera como adicional → 400.

### C3 · [EJECUCIÓN] Admin: insumos adicionales y heredados en el asistente
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/products/ProductWizardPage.tsx`.
  Secundario: `use-product-cost-preview.ts`.
- **Comportamiento nuevo:** una tarjeta nueva con el `SupplyTemplateEditor` que ya usan
  las velas (`components/domain/supply-template-editor.tsx`) para capturar insumos
  adicionales, y arriba de ella la lista de sólo lectura de los insumos heredados de la
  vela, el empaque y la tarjeta, con su origen. El array resultante viaja en
  `additionalSupplies` tanto en `previewInput` (`:102-114`) como en el guardado
  (`:158-173`) — el campo **ya existe** en el DTO (`create-product.dto.ts:117-127`) y en
  el hook de preview (`:18`), sólo falta llenarlo.
- **NO debe cambiar:** el resto del asistente, las pestañas SIMPLE/BOUQUET, ni el panel de
  costo. No se define ningún componente dentro de otro componente.
- **Comprobación:** agregar un cascabel como adicional y ver que "Insumos" del panel de
  costo sube al instante; guardar, recargar y ver que sigue ahí; cambiar el empaque y
  confirmar que el cascabel no se pierde.

### C4 · [EJECUCIÓN] La cera: elegirla en Configuración y avisar cuando falta
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/settings/SettingsPage.tsx`. Secundario:
  `features/products/components/cost-preview-panel.tsx`.
- **Comportamiento nuevo:** Configuración expone dos selects que hoy no existen en la UI
  aunque el DTO de la API ya los acepta (`update-settings.dto.ts:37`): **insumo de cera por
  defecto** (`waxSupplyId`) e **insumo de aroma por defecto** (`fragranceSupplyId`), ambos
  con `useSupplyOptions({ includeWax: true })`. Y el panel de costo, cuando
  `unitWaxCost` es 0 teniendo gramos de vela, muestra un aviso con enlace a Configuración
  en vez de un "$0.00" mudo.
  *Esta es la causa raíz de "no se está calculando el precio por cera": la fórmula está
  bien (`packages/types/src/costing/product-cost.ts:70`), pero `waxUnitCost` cae a 0 porque
  ni `Settings.waxSupplyId` ni `Candle.waxSupplyId` se pueden llenar desde el portal.*
- **NO debe cambiar:** la fórmula de costeo, el DTO de settings, ni los demás campos de
  Configuración.
- **Comprobación:** elegir "Parafina" como cera, recalcular un producto y ver "Cera"
  distinto de cero en el panel; dejarla vacía y ver el aviso.

### C5 · [EJECUCIÓN] Cera propia por vela
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/candles/CandlesPage.tsx:168-222`.
- **Comportamiento nuevo:** el formulario de vela/molde gana un select opcional de cera
  (`waxSupplyId`, que **ya existe** en Prisma `:114`, en el DTO `create-candle.dto.ts:54` y
  en el service `candles.service.ts:44,66` — sólo falta el control), con
  `useSupplyOptions({ includeWax: true })` y la opción vacía "Usar la de Configuración".
- **NO debe cambiar:** el editor de insumos propios de la vela ni el resto del formulario.
- **Comprobación:** asignar una cera de soya a una vela y ver que su producto costea con
  ese precio y no con el de Configuración.

---

## Bloque D — Cotización

### D1 · [EJECUCIÓN] El aroma pasa a ser un dropdown
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/quotations/components/quotation-line-item-editor.tsx:110-114`.
- **Comportamiento nuevo:** "Nombre del aroma" deja de ser texto libre y se vuelve un
  `Select searchable` con los insumos de tipo aroma (`type.slug === 'FRAGRANCE'`) que
  tengan `stockQty > 0`. **Se guarda el nombre del insumo en el campo `fragranceName` que
  ya existe** — sin tocar Prisma, DTO ni el motor de costeo. Si el renglón trae un aroma
  guardado que ya no está en la lista, se conserva visible en vez de borrarse. Al apagar
  "Con aroma" el campo se limpia (hoy queda un aroma huérfano guardado en un renglón sin
  aroma).
- **NO debe cambiar:** ningún otro campo del renglón, ni el `switch` de "Con aroma", ni el
  recargo por aroma.
- **Comprobación:** con un aroma en existencia aparece en la lista; al bajar su stock a
  cero desaparece; guardar y reabrir la cotización conserva el aroma elegido.

### D2 · [EJECUCIÓN] Que los totales sí se recalculen (y que el error se vea)
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/quotations/QuotationFormPage.tsx`.
  Secundario: `use-quotation-totals-preview.ts`.
- **Comportamiento nuevo:** tres arreglos, éste es el bug reportado.
  1. El preview de cada renglón se empareja **por índice de renglón**, no por
     `(productId, quantity)` como hoy (`:205`): con dos renglones del mismo producto y la
     misma cantidad, ambos muestran hoy el precio y el margen del primero. Que
     `previewInput.items` conserve el índice del renglón original en vez de compactarse con
     `.filter()` (`:94-95`).
  2. El error del preview deja de ser invisible: `use-quotation-totals-preview.ts` expone
     `isError`/`error` y la página lo pinta en el `FormError` que ya existe (`:242`). Hoy,
     cuando un "precio manual" rompe el piso de margen, la API responde 400
     `BELOW_MIN_MARGIN`, `keepPreviousData` deja los totales viejos en pantalla y no
     aparece nada — se lee exactamente como "bajé el precio y no recalculó".
  3. Un debounce de ~300 ms antes del POST: hoy cada tecla dispara un recosteo completo.
- **NO debe cambiar:** el motor de precios ni la regla de margen mínimo (bajar el piso es
  cosa de Configuración); tampoco el guardado ni el panel de totales.
- **Comprobación:** dos renglones del mismo producto e igual cantidad, precio manual
  distinto en cada uno → cada renglón muestra su propio precio; poner un precio manual
  bajo el piso → aparece el mensaje de margen mínimo al momento; en Red se ve un POST por
  pausa de tecleo, no por tecla.

### D3 · [EJECUCIÓN] Entrar a una cotización y poder editarla
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/quotations/QuotationDetailPage.tsx:118-168`.
- **Comportamiento nuevo:** un botón "Editar" que lleva a `/cotizaciones/:id/editar`,
  visible sólo cuando el estado es `DRAFT`. La ruta y el `PATCH /quotations/:id` **ya
  existen** (`App.tsx:45`, `quotations.controller.ts:43-46`); lo único que falta es la
  entrada. En estados no editables, el menú ofrece "Duplicar", que ya está.
- **NO debe cambiar:** `EDITABLE_STATUSES` en la API (`quotations.service.ts:13`), la
  acción primaria de cada estado, ni el resto del menú.
- **Comprobación:** en un borrador aparece "Editar" y al guardar regresa al detalle con
  los cambios; en una enviada no aparece.

### D4 · [EJECUCIÓN] Que el PDF sí se descargue
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/lib/http.ts:68-81`. Secundario:
  `features/quotations/QuotationDetailPage.tsx:145`.
- **Comportamiento nuevo:** `downloadPdf` adjunta el `<a>` al documento antes del click, lo
  quita después y difiere `URL.revokeObjectURL` — hoy el ancla está desconectada del DOM y
  el blob se revoca en el mismo tick, que es "no pasa nada" en Firefox y Safari. Y en 401
  hace lo mismo que `request()` (`:18-21`): limpia el token y manda a `/login`. En el
  detalle, la descarga pasa a un `useMutation` con `onError: toast.error(errorMessage(...))`,
  igual que las otras cuatro acciones de esa página — hoy la promesa se lanza suelta y
  cualquier fallo muere en la consola sin decir nada.
- **NO debe cambiar:** el endpoint de la API ni sus headers; el resto de `http.ts`.
- **Comprobación:** descargar el PDF de una cotización en Chrome y en Safari; con el token
  borrado a mano, la acción manda a login en vez de fallar muda.

### D5 · [PLAN] Reproducir el doble scrollbar — *Claude*
Es el único punto que no se resolvió leyendo el código. El shell tiene **un solo**
scroller (`AppLayout.tsx:161`), y el popover de los selects no bloquea el scroll. Se abre
la pantalla en el navegador, se confirma cuál es la segunda barra y si el desplazamiento
del layout viene del `padding-right` que Radix mete en `body` al abrir un diálogo (el
`body` nunca fue el scroller, así que ese bloqueo no sirve de nada y sí empuja la página).
Con eso se escribe el encargo de D6.

### D6 · [EJECUCIÓN] Arreglar el scroll del shell
**Encargo a Codex** — *se redacta al cerrar D5.* Alcance previsto:
`apps/admin/src/components/layout/AppLayout.tsx`, dejando que el documento sea el único
scroller y el sidebar `sticky`, de modo que el bloqueo de scroll de los diálogos actúe
sobre el elemento correcto. **NO debe cambiar** el aspecto del sidebar, el menú móvil ni
ninguna página. **Comprobación:** una sola barra vertical en cotizaciones, clientes y
compras; al abrir un diálogo el fondo no se mueve ni se desplaza; `pnpm --filter
@lignumvitae/admin e2e` (incluye `modals.spec.ts` y `dropdowns.spec.ts`) en verde.

---

## Bloque E — Clientes

### E1 · [EJECUCIÓN] Teléfono de 10 dígitos y fuera WhatsApp
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/customers/CustomersPage.tsx`.
  Secundarios: `apps/api/src/modules/sales/customers/dto/create-customer.dto.ts:6-7`,
  `apps/admin/src/lib/types.ts:230`.
- **Comportamiento nuevo:** "Teléfono" acepta exactamente 10 dígitos —`inputMode="numeric"`,
  `maxLength`, `pattern` y validación en el DTO con `@Matches`—; hoy no hay ninguna
  validación en ninguna capa y se acepta `"asdf"`. El campo WhatsApp desaparece del
  formulario, de la columna de la tabla, del payload y del DTO.
- **NO debe cambiar:** `Settings.whatsapp`, que es otro campo distinto, obligatorio, y es
  el que se imprime en el encabezado de todos los PDFs
  (`pdf.service.ts:36` → `templates/quotation.hbs:39`). La columna `Customer.whatsapp` se
  queda en la base sin migración; sólo se deja de usar.
- **Comprobación:** un teléfono de 9 dígitos no deja guardar y lo dice; enviar `whatsapp`
  a la API devuelve 400; el PDF de una cotización sigue mostrando el WhatsApp del negocio.

### E2 · [EJECUCIÓN] Dar de alta un cliente desde la cotización
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/customers/quick-create-dialog.tsx`
  (nuevo). Secundario: `features/quotations/QuotationFormPage.tsx:181-183`.
- **Comportamiento nuevo:** cuando el cliente buscado no existe, un botón junto al select
  abre un diálogo corto (nombre y teléfono, con las mismas reglas de E1), hace
  `POST /customers`, invalida `['customers']` y **deja seleccionado al cliente recién
  creado** en la cotización.
- **NO debe cambiar:** el `Select` de cliente ni `useCustomerOptions`; la página de
  Clientes sigue siendo la del alta completa. Sin endpoints nuevos.
- **Comprobación:** crear un cliente desde una cotización nueva, verlo ya seleccionado,
  guardar la cotización y encontrar al cliente en `/clientes`.

---

## Bloque F — Compras

### F1 · [EJECUCIÓN] API: la descripción deja de ser obligatoria
**Encargo a Codex**
- **Archivo principal:** `apps/api/src/modules/inventory/purchases/dto/create-purchase.dto.ts:24-26`.
  Secundario: `purchases.service.ts:85-132`.
- **Comportamiento nuevo:** `description` pasa a `@IsOptional()` y el servicio la **deriva
  cuando llega vacía**: nombre del insumo si es SUPPLY, `assetName` si es ASSET, nombre de
  la categoría si es EXPENSE. Esta es la causa raíz del bug reportado —el front manda
  `description: ""` (`PurchasesPage.tsx:103`) y el validador la rechaza sin que el
  formulario marque nada—, y se arregla en el único punto por el que pasan los tres tipos
  de renglón, no en cada uno.
- **NO debe cambiar:** el resto de validaciones del DTO, el prorrateo de flete, los
  movimientos de stock ni el cálculo de costos.
- **Comprobación:** el payload exacto reportado (1 insumo + 1 molde, ambos con
  `description: ""`) se registra sin error, y la compra guardada muestra "Parafina" y el
  nombre del molde como descripción.

### F2 · [EJECUCIÓN] Admin: renombrar los campos del renglón de insumo
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/purchases/PurchasesPage.tsx:236-256`.
- **Comportamiento nuevo:** en el renglón de insumo, "Paquetes" → **"Cantidad"**;
  "Contenido / paquete (g)" → **"Contenido por unidad (g)"**, conservando la abreviatura de
  la unidad del insumo elegido; "Precio / paquete" → **"Precio unitario"**. El input de
  descripción queda opcional y con `placeholder` que diga que se llena solo con el nombre
  del insumo.
- **NO debe cambiar:** los nombres de los campos del payload (`packsQty`,
  `baseQtyPerPack`, `pricePerPack`), los renglones de molde y gasto, ni los tooltips que
  explican el contenido por unidad.
- **Comprobación:** `pnpm --filter @lignumvitae/admin e2e -- purchases.spec.ts` en verde
  (ajustando ahí los textos si los busca por etiqueta); registrar una compra da el mismo
  costo por unidad base que antes.

### F3 · [PLAN] Diseñar cancelar-y-recrear — *Claude*
Registrar una compra escribe en cuatro tablas (`purchase_items`, `stock_movements`,
`assets`, `expenses`) y dispara un recálculo de costo sugerido. El `deactivate` actual
(`purchases.service.ts:177-189`) sólo revierte el stock: deja vivos el activo creado, el
gasto del mes y el costo sugerido desactualizado. Se define qué revierte exactamente la
cancelación, qué pasa si el mes ya está cerrado en Cierre mensual, y si la compra
corregida conserva folio o toma uno nuevo.

### F4 · [EJECUCIÓN] API: cancelar de verdad y editar recreando
**Encargo a Codex** — *el detalle de la reversión sale de F3.* Alcance previsto:
- **Archivo principal:** `apps/api/src/modules/inventory/purchases/purchases.service.ts`.
  Secundario: `purchases.controller.ts`.
- **Comportamiento nuevo:** `deactivate` revierte **todo** lo que creó la compra (stock,
  activo creado o incrementado, gasto del periodo) y vuelve a calcular el costo sugerido
  de los insumos afectados; un `PATCH /purchases/:id` que, en una transacción, cancela la
  compra y crea la corregida reusando el `create` que ya existe. Se rechaza editar o
  cancelar una compra cuyo mes ya esté cerrado.
- **NO debe cambiar:** el prorrateo de flete, la generación de folios, ni `currentUnitCost`
  de los insumos (que sólo se toca con "Aplicar" y así se queda).
- **Comprobación:** registrar una compra con insumo + molde + gasto, cancelarla y verificar
  que el stock, el activo y el gasto vuelven a su estado previo; editarla y ver que el
  stock refleja los números nuevos y no la suma de los dos.

### F5 · [EJECUCIÓN] Admin: editar y eliminar desde el listado
**Encargo a Codex**
- **Archivo principal:** `apps/admin/src/features/purchases/PurchasesPage.tsx`.
- **Comportamiento nuevo:** una columna de acciones con "Editar" (reabre el diálogo con los
  renglones cargados y guarda con `PATCH`) y "Eliminar" (con `useConfirm`, avisando que se
  revierte el stock). Mismo patrón que `SuppliesPage.tsx:182-191`.
- **NO debe cambiar:** el diálogo de alta se reusa, no se duplica; sin encabezado ni
  toolbar nuevos.
- **Comprobación:** capturar una compra mal, corregirla y ver el stock correcto; eliminar
  otra y ver el stock de vuelta como antes.

---

## Verificación de extremo a extremo

Al terminar todos los bloques, con `pnpm db:up && pnpm db:reset && pnpm db:seed` y
`pnpm dev`:

1. Configuración → elegir insumo de cera. Catálogo → crear un tipo de insumo nuevo.
2. Insumos → alta con ese tipo, en el orden nuevo de campos y sin "Como se compra".
3. Compras → registrar una compra con insumo + molde + gasto, todo sin descripción;
   editarla; eliminarla; comprobar el stock en cada paso.
4. Productos → crear un producto con un insumo adicional; ver los heredados y que "Cera"
   ya no es cero.
5. Cotización → crear un cliente desde el select, dos renglones del mismo producto con
   precios manuales distintos, uno bajo el piso de margen (debe avisar), guardar, editar
   desde el detalle, descargar el PDF.
6. `pnpm lint`, `pnpm test` y `pnpm --filter @lignumvitae/admin e2e` en verde.

---

## El riesgo más grande

La migración del bloque A: convertir `SupplyType` y `UnitOfMeasure` de enum a tabla toca
las cinco columnas de las que cuelga todo el motor de costeo, y un backfill incompleto
deja insumos sin tipo ni unidad y todos los costos en cero sin que nada falle a gritos.

---

# Cómo ejecutar este plan

Para quien lo tome desde cero. Léelo completo antes del primer `pnpm install`.

## 1. Antes de escribir código, lee dos archivos

- **`AGENTS.md`** en la raíz: tiene las reglas duras del portal admin y no se negocian.
  En corto: los colores salen sólo de los tokens de `apps/admin/src/styles/tokens.css`
  (nunca un hex ni un color crudo de Tailwind); la tipografía usa la escala del proyecto
  (`text-body-sm`, `text-heading`...), nunca `text-sm` ni `text-[10px]`; las páginas se
  arman con las primitivas de `components/ui/page.tsx` y los componentes de
  `components/ui/`, sin copiar el encabezado de la página vecina; todo botón de sólo icono
  lleva `aria-label`; y nunca se define un componente dentro de otro componente.
- **`CLAUDE.md`**: cómo se reparte el trabajo con Codex.

Un diff que rompa esas reglas se devuelve, por correcto que sea el comportamiento.

## 2. Levantar el entorno

Node 22 (está en `.nvmrc`) y pnpm 10.14. Postgres corre en Docker en el **puerto 5434**,
no el 5432.

```bash
cp .env.example .env && pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev
```

El admin queda en `http://localhost:5173` y la API en `http://localhost:3000`. Se entra
con las credenciales que siembra `prisma/seed.ts` (`SEED_ADMIN_USERNAME` /
`SEED_ADMIN_PASSWORD` del `.env`). Si el admin responde 401 contra todo, revisa que
`CORS_ORIGINS` tenga el puerto real que tomó Vite: sin esa variable, la API bloquea
**todos** los orígenes y el síntoma no dice por qué.

## 3. Cuatro pasos del plan son decisiones, no código

**A1, C1, D5 y F3 están marcados `[PLAN]` y todavía no están resueltos.** No son trámite:

- **A1** define el modelo de las dos tablas nuevas y la tabla de mapeo enum→slug del
  backfill. **A2 no se puede empezar sin esto.**
- **C1** define cómo se muestran los insumos heredados en el asistente de producto.
- **D5** es reproducir el doble scrollbar en el navegador. **El encargo de D6 está en
  blanco a propósito** — se escribe con lo que se vea ahí, no antes. Es el único punto del
  plan que no se pudo diagnosticar leyendo el código.
- **F3** define qué revierte exactamente la cancelación de una compra. **El encargo de F4
  depende de esto.**

Quien ejecute puede resolverlos, pero tiene que resolverlos *antes* del paso de ejecución
que cuelga de cada uno, y dejarlos escritos.

## 4. El orden importa, y no todo se puede paralelizar

**El bloque A va primero y completo.** Toca `Supply`, `ProductSupply`,
`CandleSupplyTemplate` y las plantillas de empaque y tarjeta; cualquier otro bloque que se
adelante va a chocar con él. En particular B1, A5 y F2 tocan los mismos archivos que A.

Después de A, el resto de bloques (B, C, D, E, F) son razonablemente independientes entre
sí. Dentro de cada bloque, respeta el orden: D3 y D4 tocan `QuotationDetailPage.tsx`, F1 y
F2 son las dos mitades del mismo bug de compras.

## 5. Trampas concretas de este repo

- **Regenerar los tipos del cliente.** Cada vez que cambie un DTO o una respuesta de la
  API hay que correr `pnpm gen:api`, **y eso requiere la API corriendo en el 3000** (lee
  `http://localhost:3000/api-json`). Si se olvida, `packages/types/src/client/openapi-schema.d.ts`
  queda mintiendo y el admin compila con tipos viejos.
- **`ValidationPipe` con `forbidNonWhitelisted`.** Cualquier propiedad de más en el body es
  un 400, no se ignora. Al quitar un campo del formulario (B1, E1) hay que quitarlo también
  del DTO, o al revés: quitarlo del DTO rompe el formulario que todavía lo manda.
- **Hay tres campos `whatsapp` distintos.** `Customer.whatsapp` es el que se quita.
  `Settings.whatsapp` es obligatorio y es el que se imprime en el encabezado de **todos**
  los PDFs. `QuoteRequest.whatsapp` es del cotizador público. Confundirlos es el error caro
  del bloque E.
- **Migraciones.** Sólo hay dos en el repo. La del bloque A es delicada: siembra las filas
  y hace el backfill **antes** de soltar los enums, todo en la misma migración, y se prueba
  contra una base **con datos**, no sólo contra un `db:reset`.

## 6. Qué correr para dar un paso por terminado

```bash
pnpm lint && pnpm test && pnpm --filter @lignumvitae/admin build
```

Y los e2e de Playwright (`apps/admin/e2e/`) cuando el paso toque UI —
`purchases.spec.ts` y `sales-flow.spec.ts` cubren justo las zonas de este plan, y
`modals.spec.ts` / `dropdowns.spec.ts` son la red de seguridad del paso D6.

Cada paso trae su propia comprobación escrita en el encargo. Ésa es la que manda: correr
el lint no sustituye abrir la pantalla y ver el comportamiento.

## 7. Lo que NO está en este plan

Para que no se cuele por el camino:

- **Editar pedidos.** Se decidió dejarlo como está: si hace falta agregar productos, se
  hace una cotización y un pedido nuevos.
- **Que los "minutos de diseño" cambien el precio de venta.** Hoy sólo mueven el costo y el
  margen, porque el precio sale del precio de catálogo guardado. Es un cambio en el motor
  de precios y está fuera de alcance.
- **Conversión entre unidades de medida.** No existe hoy (`packages/types/src/costing/units.ts`
  tiene un `convertToBase` que nadie llama) y el bloque A no la introduce. Ojo con esto al
  crear unidades nuevas: el costeo de cera asume `$/gramo`, así que una cera dada de alta
  en kilogramos sale ×1000.
