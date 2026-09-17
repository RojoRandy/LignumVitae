# A1 · Modelo de los dos catálogos (decisión cerrada)

Insumo de A2 (Prisma + migración), A3 (API), A4 (CRUD), A5/A6 (admin).

## Regla que gobierna todo

**El slug es idéntico al valor del enum de hoy.** No hay traducción: `WAX` → slug
`WAX`. Esto hace que el backfill sea `UPDATE ... SET type_id = (SELECT id FROM
supply_types WHERE slug = type::text)` y que cualquier fila sin correspondencia
sea imposible por construcción. El nombre visible en español ya existía en el
front (`SuppliesPage.tsx:23-52`) y se muda a la base tal cual, sin acentos, como
está hoy.

## Modelo `SupplyType` — tabla `inventory.supply_types`

| campo | tipo | notas |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `slug` | `String @unique` | MAYÚSCULAS_CON_GUION_BAJO. Inmutable si `isSystem` |
| `name` | `String @unique` | visible, editable siempre |
| `sortOrder` | `Int @default(0)` | orden de los selects |
| `isSystem` | `Boolean @default(false)` | |
| `isActive` | `Boolean @default(true)` | |
| `createdAt` / `updatedAt` | | como el resto de los modelos |

Relación: `supplies Supply[]`.

## Modelo `UnitOfMeasure` — tabla `inventory.units_of_measure`

Mismos campos, más:

| campo | tipo | notas |
|---|---|---|
| `abbr` | `String` | abreviatura corta: `g`, `kg`, `ml`… |

Relaciones: `supplies Supply[]`, `productSupplies ProductSupply[]`,
`candleTemplates CandleSupplyTemplate[]`, `packagingTemplates PackagingSupplyTemplate[]`,
`cardTemplates CardSupplyTemplate[]`.

## Qué protege `isSystem`

Las 17 + 8 filas sembradas nacen `isSystem: true`. Sobre una fila de sistema:

- **no se borra** (ni baja lógica): `DELETE` → 400 `SYSTEM_ROW_PROTECTED`
- **no se cambia el `slug`**: `PATCH` con `slug` distinto → 400 `SYSTEM_ROW_PROTECTED`
- **sí se edita** `name`, `abbr` y `sortOrder`

Una fila creada por el usuario (`isSystem: false`) se borra sólo si nadie la usa
(400 `HAS_DEPENDENTS`, el mismo error que ya lanza `supplies.service.ts:63-70`).

## Las 6 columnas que pasan de enum a FK

| modelo | columna hoy | columna nueva | mapeo en base |
|---|---|---|---|
| `Supply` | `type: SupplyType` | `typeId: Int` → `SupplyType` | `type_id` |
| `Supply` | `unit: UnitOfMeasure` | `unitId: Int` → `UnitOfMeasure` | `unit_id` |
| `ProductSupply` | `unit: UnitOfMeasure` | `unitId: Int` | `unit_id` |
| `CandleSupplyTemplate` | `unit: UnitOfMeasure` | `unitId: Int` | `unit_id` |
| `PackagingSupplyTemplate` | `unit: UnitOfMeasure` | `unitId: Int` | `unit_id` |
| `CardSupplyTemplate` | `unit: UnitOfMeasure` | `unitId: Int` | `unit_id` |

Todas **obligatorias** (`Int`, no `Int?`) y con `onDelete: Restrict` — que es el
default de Prisma para una relación requerida, así que no se escribe.
`@@index([type])` de `Supply` (`schema.prisma:479`) pasa a `@@index([typeId])`, y
se agrega `@@index([unitId])`.

Los dos enums `SupplyType` y `UnitOfMeasure` se **borran** de `schema.prisma`
(`DROP TYPE` al final de la migración). Nada más los usa.

## Tabla de siembra — tipos de insumo

`slug` = enum de hoy, `name` = etiqueta de `SuppliesPage.tsx:23-52`, `sortOrder` =
el orden en que están escritos ahí (que es el orden con el que el usuario ya los
ve), en pasos de 10 para dejar hueco.

| slug | name | sortOrder |
|---|---|---|
| `WAX` | Cera | 10 |
| `FRAGRANCE` | Aroma | 20 |
| `WICK` | Mecha | 30 |
| `DYE` | Colorante | 40 |
| `ALUMINUM_BASE` | Base de aluminio | 50 |
| `CELLOPHANE` | Celofan | 60 |
| `RIBBON` | Liston | 70 |
| `LABEL` | Etiqueta | 80 |
| `PRINTING` | Impresion | 90 |
| `SEAL` | Sello | 100 |
| `BELL` | Cascabel | 110 |
| `SILICONE` | Silicon | 120 |
| `BOX` | Caja | 130 |
| `TULLE` | Tul | 140 |
| `ACETATE` | Acetato | 150 |
| `PAPER` | Papel | 160 |
| `OTHER` | Otro | 170 |

## Tabla de siembra — unidades de medida

`name` de `SuppliesPage.tsx:43-52`, `abbr` de `PurchasesPage.tsx:46-48` (que es la
misma tabla que usa `supply-template-editor.tsx:21`).

| slug | name | abbr | sortOrder |
|---|---|---|---|
| `GRAM` | Gramo | g | 10 |
| `KILOGRAM` | Kilogramo | kg | 20 |
| `MILLILITER` | Mililitro | ml | 30 |
| `LITER` | Litro | l | 40 |
| `CENTIMETER` | Centimetro | cm | 50 |
| `METER` | Metro | m | 60 |
| `PIECE` | Pieza | pz | 70 |
| `SHEET` | Pliego | pliegos | 80 |

## Los dos slugs de los que depende el código

`WAX` (excluido de los BOM: `use-supply-options.ts:17`, y el error `SUPPLY_IS_WAX`)
y `FRAGRANCE` (el aroma del renglón de cotización, D1). Después de A3 nadie
compara con el enum: se compara `supply.type.slug === 'WAX'`. Son `isSystem`, así
que su slug no se puede cambiar desde el portal y esas comparaciones no se pueden
romper por captura.

## Lo que este modelo NO trae

- **Sin conversión entre unidades.** `abbr` es etiqueta, no factor. El costeo
  sigue asumiendo que el insumo se captura en su unidad base (una cera dada de
  alta en kilogramos sale ×1000; eso ya pasa hoy y sigue igual).
- **Sin `isSystem` en las filas nuevas** que cree el usuario.
- **Sin abstracción compartida** entre los dos módulos CRUD (A4 lo dice explícito).
