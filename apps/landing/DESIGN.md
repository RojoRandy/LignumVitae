# Design System — Lignum Vitae (landing pública)

> Adaptado de `design-md/starbucks/DESIGN.md` de
> [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (clon local en
> `C:\Randy\awesome-design-md`). Se conserva la estructura y el ritmo de Starbucks: tienda cálida,
> sistema de verdes por rol, lienzo crema, botones pill y detalle de producto con stepper. Todos los
> colores y fuentes se cambiaron por los de la marca.
>
> **Fuente de verdad de la paleta:** `packages/tailwind-preset/theme.css`. Ese archivo no se edita.
> Ningún componente escribe un hex. Todo pasa por los tokens semánticos de
> `apps/landing/src/styles/global.css`, definidos en la sección 2.

## 0. Mapeo de roles (Starbucks → Lignum Vitae)

| Rol original | Hex original | Token de marca | Hex | Token semántico (global.css) |
|---|---|---|---|---|
| Green Accent (CTA) | #00754A | teal-700 | #3D6660 | `--color-action` |
| CTA hover / pressed | — | teal-800 | #2F504B | `--color-action-hover` |
| Starbucks Green (encabezados) | #006241 | moss-800 | #4A5B53 | `--color-brand` |
| House Green (bandas y footer) | #1E3932 | moss-900 | #374039 | `--color-band` |
| Green Uplift (decorativo) | #2b5148 | moss-700 | #4D5E55 | `--color-band-soft` |
| Green Light (tinte válido y utilitario) | #d4e9e2 | sage-100 / sage-50 | #D1E5C2 / #EFF6E9 | `--color-action-soft` / `--color-surface-tint` |
| Neutral Warm (lienzo) | #f2f0eb | cream-50 | #F7F4EC | `--color-canvas` |
| Ceramic (separador de zona) | #edebe9 | cream-100 | #E9E3D3 | `--color-canvas-deep` |
| White (tarjeta) | #ffffff | paper | #FFFFFF | `--color-surface` |
| Text Black rgba(0,0,0,.87) | — | ink | #26302A | `--color-text` |
| Text Black Soft rgba(0,0,0,.58) | — | moss-600 | #5C6E63 | `--color-text-muted` |
| Text White (sobre banda) | #ffffff | paper | #FFFFFF | `--color-on-band` |
| Text White Soft rgba(255,255,255,.70) | — | sage-300 | #B2CBAE | `--color-on-band-muted` |
| Input border #d6dbde | — | sage-300 | #B2CBAE | `--color-border-strong` |
| Hairline #e7e7e7 | — | cream-200 | #E4DDCB | `--color-border` |
| Gold / Gold Light / Gold Lightest (Rewards) | #cba258… | — | — | **Se elimina.** No hay equivalente en la marca. "Destacado" usa `action-soft`. |
| Red (error) | #c82014 | — | — | Reusa `danger` de `apps/admin/src/styles/tokens.css` (#A32B2B texto / #FBEAEA fondo), ya aprobado en el proyecto. Se define una sola vez en global.css. |
| Yellow (warning) | #fbbc05 | — | — | **Se elimina.** No hace falta en la landing. |

Tipografía:

| Original | Lignum Vitae | Uso |
|---|---|---|
| SoDoSans (UI universal) | **Jost** (`--font-body`) | Todo el texto de interfaz, cuerpo, botones y formularios |
| Lander Tall (serif editorial) | **Fraunces** (`--font-display`) | H1/H2, títulos de producto y de sección. En esta marca la serif **sí** es la voz principal de los encabezados. |
| Kalam (script de "nombre en vaso") | **Parisienne** (`--font-accent`) | Solo adornos: una palabra en el hero ("hecho a mano"), el título "Pedidos" en Cómo funciona. Nunca en párrafos ni botones. |

Contraste verificado (WCAG AA ≥ 4.5 para texto normal):

| Texto / fondo | Ratio |
|---|---|
| ink / cream-50 | 12.4 |
| ink / paper | 13.7 |
| moss-600 / cream-50 | 4.94 |
| moss-600 / paper | 5.43 |
| moss-800 / cream-50 | 6.56 |
| teal-700 / cream-50 | 5.85 |
| paper / teal-700 | 6.43 |
| paper / moss-900 | 10.7 |
| sage-300 / moss-900 | 6.16 |
| moss-800 / sage-100 | 5.39 |

**Prohibido:** `text-muted` (moss-600) sobre `canvas-deep` (cream-100) da 4.24 y no pasa. Sobre cream-100 el texto va siempre en `ink`.

## 1. Visual Theme & Atmosphere

Lignum Vitae es un **taller cálido y artesanal**: velas de recuerdo hechas a mano para XV años,
bautizos, bodas y fechas especiales, con entrega solo en Durango. Su lema es "Mi pequeño paraíso".
El lienzo alterna entre crema (`canvas`, cream-50) y un crema más profundo (`canvas-deep`, cream-100),
como el papel de las tarjetas y el empaque. Los verdes de la marca (moss, teal, sage) salen del logotipo y del catálogo
impreso. Cada verde tiene su propio rol, igual que los cuatro verdes de Starbucks:
- **moss-800:** encabezados.
- **teal-700:** el ÚNICO acento, reservado para CTAs.
- **moss-900:** bandas profundas y footer.
- **sage:** tintes suaves.

La fotografía manda: velas blancas o de color con listón y tarjeta personalizada sobre fondos claros. La
interfaz se aparta de las fotos y no compite con ellas.

**Características clave:**
- Sistema de verdes por rol, sin un único "verde de marca" para todo.
- Lienzo crema, nunca blanco puro. El blanco es para tarjetas.
- Fraunces en los encabezados y Jost en la interfaz. Parisienne es un guiño, no un sistema.
- Botones pill (`9999px`) universales, con `scale(0.95)` al presionar.
- Botón flotante **"Mi cotización"**, equivalente al "Frap" de Starbucks: 56 px, círculo `action` con icono de bolsa y contador. Es el elemento más elevado de la página.
- Tarjetas con `--radius-card` (16 px, del preset) y sombra en capas muy suave.
- Sin degradados. El ritmo se hace con bloques de color.

**Ritmo de página:** barra de aviso (`band`) → hero crema → secciones con tarjetas blancas sobre crema →
banda `band` ("Cómo funciona") → zona crema profunda → footer `band`. Las bandas verde oscuro enmarcan
el cuerpo claro.

## 2. Color Palette & Roles

> **Nombres de color vs. tamaños de letra:** en Tailwind v4 un token de color `--color-X` y uno de
> tipografía `--text-X` generan la misma clase `text-X`, y esa clase aplicaría color **y** tamaño a la vez.
> Por eso los colores se llaman `brand` y `action`, y `heading*`, `accent`, `body*`, `caption` y `micro`
> quedan reservados para la escala tipográfica. Ningún color nuevo puede usar esos nombres.

Todos los tokens van en `apps/landing/src/styles/global.css`, en un bloque `:root`. Se exponen a Tailwind
con `@theme inline` igual que en el admin: `bg-canvas`, `text-brand`, etc. Sin modo oscuro: la marca es
clara.

### Primary
- `--color-action`: teal-700. CTA principal, links de acción, anillo activo del stepper y el botón flotante.
- `--color-action-hover`: teal-800.
- `--color-brand`: moss-800. H1 y H2 sobre fondo claro.

### Bandas oscuras
- `--color-band`: moss-900. Barra de aviso, banda "Cómo funciona", footer.
- `--color-band-soft`: moss-700. Detalles decorativos dentro de una banda.
- `--color-on-band`: paper. Títulos y texto principal sobre la banda.
- `--color-on-band-muted`: sage-300. Texto secundario sobre la banda (6.16:1).

### Surface & Background
- `--color-canvas`: cream-50. Fondo de página.
- `--color-canvas-deep`: cream-100. Zonas alternas (galería, contacto).
- `--color-surface`: paper. Tarjetas, formularios, modal.
- `--color-surface-tint`: sage-50. Aviso informativo (entrega o anticipación) y campo válido.
- `--color-action-soft`: sage-100. Badge "Destacado" y chip de categoría activo.

### Neutrals & Text
- `--color-text`: ink.
- `--color-text-muted`: moss-600. Metadatos, ayudas y pies de foto, solo sobre `canvas` o `surface`.
- `--color-border`: cream-200. Hairlines y divisores de tabla.
- `--color-border-strong`: sage-300. Borde de inputs y del stepper.

### Semantic
- `--color-danger-fg` #A32B2B y `--color-danger-bg` #FBEAEA: se copian de `apps/admin/src/styles/tokens.css` y son los únicos hex fuera del preset permitidos. Se usan en errores de formulario.
- Éxito: `action` sobre `surface-tint`. No hace falta un verde extra.

### Gradient System
Ninguno. Bloques de color sólidos.

## 3. Typography Rules

### Font Family
- **Display:** `var(--font-display)` = Fraunces (Google Fonts, pesos 400/600, óptico automático).
- **Body/UI:** `var(--font-body)` = Jost (400/500/600).
- **Accent:** `var(--font-accent)` = Parisienne (400).
- Carga: un solo `<link>` a Google Fonts con `display=swap` y `preconnect`.

### Hierarchy
Se definen en global.css con los mismos nombres de la escala del admin, más `display-xl`:

| Token | Móvil | ≥ 1024 px | Peso | Line height | Fuente | Uso |
|---|---|---|---|---|---|---|
| `text-display-xl` | 40px | 64px | 400 | 1.1 | Fraunces | H1 del hero |
| `text-display-lg` | 34px | 44px | 400 | 1.15 | Fraunces | Título de página (Catálogo, producto) |
| `text-heading-lg` | 28px | 34px | 600 | 1.2 | Fraunces | H2 de sección |
| `text-heading` | 22px | 26px | 600 | 1.25 | Fraunces | Nombre de categoría, título de tarjeta grande |
| `text-heading-sm` | 20px | 20px | 500 | 1.3 | Jost | Nombre de producto en tarjeta |
| `text-body-lg` | 18px | 18px | 400 | 1.7 | Jost | Intro del hero y de las bandas |
| `text-body` | 16px | 16px | 400 | 1.5 | Jost | Cuerpo |
| `text-body-sm` | 14px | 14px | 400–600 | 1.5 | Jost | Botones, labels, metadatos |
| `text-caption` | 13px | 13px | 400 | 1.5 | Jost | Ayudas de formulario, pies |
| `text-micro` | 12px | 12px | 600 | 1.4 | Jost | Badges; mayúsculas con tracking 0.1em |
| `text-accent` | 40px | 56px | 400 | 1 | Parisienne | Palabra decorativa (máx. 1 por pantalla) |

### Principles
- Los encabezados van en Fraunces y color `brand`. La jerarquía la dan el tamaño y el peso.
- Tracking: Jost `-0.01em` en cuerpo y `0.1em` en `text-micro` mayúsculas. Fraunces sin tracking negativo.
- El cuerpo nunca va en negro puro: siempre `text` (ink).
- Nunca `text-xs`, `text-sm`, `text-base` ni `text-lg` de Tailwind, ni tamaños arbitrarios.

## 4. Component Stylings

### Buttons
Todos son pill (`rounded-full`), con padding `12px 24px` (mínimo 44 px de alto), `text-body-sm` y
peso 600. Llevan `transition: transform .2s var(--ease-out), background-color .2s` y `active:scale-95`.
No se quita el foco: `outline 2px action, offset 2px`.

1. **Primary Filled:** fondo `action` y texto `surface`; en hover, `action-hover`. Para "Agregar a mi cotización", "Enviar solicitud", "Ver catálogo" y "Aceptar cotización".
2. **Primary Outlined:** transparente, texto y borde 1px `action`. Para acciones secundarias.
3. **Inverted on Band:** fondo `surface` y texto `action`. CTA principal dentro de una banda oscura.
4. **Outlined on Band:** transparente, texto y borde `on-band`. Secundario dentro de una banda.
5. **WhatsApp:** variante Primary Outlined con icono de WhatsApp. No usa el verde de WhatsApp.
6. **"Mi cotización" flotante (el "Frap"):**
   - Forma: círculo de 56 px, fondo `action`, icono de bolsa en `surface`, fijo abajo a la derecha (16 px de margen) y con un área táctil 8 px más grande.
   - Contador: badge `action-soft` con texto `brand` y `text-micro`. Se oculta en 0.
   - Sombra y accesibilidad: sombra `--shadow-float` y `aria-label="Mi cotización, N productos"`.
   - Se oculta en `/cotizar` y `/cotizacion/*`.
7. **Link de texto:** `action`, subrayado en hover.

### Cards & Containers
- **Tarjeta de producto (`ProductCard`):**
  - Contenedor: fondo `surface`, `--radius-card`, sombra `--shadow-card`.
  - Imagen: 4:5 con `object-cover`, fade-in de 0.3 s y `loading="lazy"`.
  - Abajo, con padding de 16 px: nombre (`text-heading-sm`, `text`).
  - Si es destacado, badge "Destacado" (`text-micro`, `action-soft`) sobre la foto, arriba a la izquierda.
  - Toda la tarjeta es un solo `<a>`. En hover, la imagen hace `scale(1.03)` en 0.4 s.
- **Tarjeta de categoría:**
  - Imagen 1:1 con `--radius-card`, sin overlay ni degradado. El nombre va en una franja sólida `surface` debajo de la imagen.
  - Contenido: nombre (`text-heading`, Fraunces) y descripción de 1 línea (`text-muted`).
- **Aviso informativo:** fondo `surface-tint`, borde izquierdo 3px `action`, `--radius-input`, icono y texto `text-body-sm`. Se usa para "Entregas solo en {city}" y "Mínimo {N} días de anticipación".
- **Modal / confirm:** se usa `confirm()` nativo. Única excepción: el lightbox de la galería de la home, con `<dialog>` nativo (fondo `ink` al 85 %, controles `surface/90`).

### Inputs & Forms
- **Input:**
  - Aspecto: fondo `surface`, borde 1px `border-strong`, `--radius-input` (10 px), padding de 12 px, `text-body` y alto mínimo de 44 px.
  - Label arriba (no flotante, por simplicidad) en `text-body-sm` peso 500.
  - Focus: borde `action` y anillo de 2px `action-soft`.
  - Error: borde `danger-fg`, fondo `danger-bg` y mensaje `text-caption danger-fg` debajo con `aria-describedby`.
- **Stepper de cantidad** (del PDP de Starbucks):
  - Botones `−` y `+` circulares de 40 px, borde 1px `border-strong` y `aria-label` "Menos" / "Más".
  - En medio, un `<input type="number" min="1">` de 64 px de ancho, centrado, `text-body` peso 600.
- **Checkbox "Con aroma":** nativo con `accent-color: var(--color-action)`.
- **Fecha:** `<input type="date" min>` nativo con el estilo del input.
- **Honeypot:** `.sr-only`-like fuera de pantalla, `tabindex="-1"` y `autocomplete="off"`, con label "No llenar".

### Navigation
- **Barra de aviso** (arriba de todo): fondo `band`, texto `on-band`, `text-caption`, centrada, de una línea. Dice "Entregas solo en {city} · Pide con al menos {N} días de anticipación".
- **Header:**
  - Estructura: fondo `canvas` y `sticky top-0`. Alto de 64 px en móvil y 80 px en escritorio, con sombra `--shadow-nav` al hacer scroll (o siempre, por simplicidad).
  - Izquierda: logo (`/logo.svg`, 40–48 px).
  - Centro/derecha: Catálogo · Cómo funciona · Nosotros · Contacto (`text-body-sm` peso 500, `text`; en hover, `action`).
  - Derecha: botón Primary Outlined "Mi cotización (N)".
- **Móvil (< 768 px):**
  - Los links pasan a un `<details>`/`<summary>` nativo con icono de menú y `aria-label`.
  - El panel se despliega debajo sobre `surface`.
  - El botón flotante siempre está visible.
- **Chips de categoría** (catálogo):
  - Barra `sticky` bajo el header con scroll horizontal y sin barra visible.
  - Cada chip es pill, borde `border-strong`, `text-body-sm`. El activo lleva fondo `action-soft` y texto `brand`.

### Image Treatment
- Fotos de producto en 4:5 (tarjeta) y 1:1 o 4:5 (carrusel), con `object-cover` y fondo `canvas-deep` mientras cargan.
- Fade-in: `opacity .3s ease-in`.
- Hero: foto real de `public/galeria/`. Nunca ilustración genérica.

### Feature Band ("Cómo funciona")
- Banda de ancho completo con fondo `band`.
- Título "Pedidos" en `text-accent` (Parisienne) y `on-band`, seguido de un H2 Fraunces `on-band`.
- Grid de 5 pasos con icono de línea (stroke `on-band-muted`), título `on-band` en `text-body` peso 600 y texto `on-band-muted`:
  1. Mínimo {minLeadTimeDays} días de anticipación.
  2. Confirma con el {depositPct}% de anticipo.
  3. Pago por transferencia o efectivo.
  4. Envío con costo adicional, solo en {city}.
  5. Una vez confirmado, no hay cambios ni cancelaciones.
- CTA Inverted on Band: "Solicitar cotización".

### Product Detail (PDP)
- Escritorio: dos columnas 55/45. Móvil: apilado, con el carrusel arriba.
- **Carrusel:**
  - Estructura: contenedor `overflow-x: auto; scroll-snap-type: x mandatory`, slides al 100 % con `scroll-snap-align: center` y `--radius-card`.
  - Controles:
    - botones circulares de 40 px (`surface` al 90 %, icono `text` y `aria-label` "Imagen anterior" / "Imagen siguiente") sobre la imagen;
    - puntos abajo: `<button>` de 8 px, `border-strong`, y el activo en `action`;
    - flechas del teclado cuando el carrusel tiene foco (`tabindex="0"`, `aria-roledescription="carrusel"`).
  - Con 1 imagen no hay controles. Sin imágenes se muestra el logo sobre `canvas-deep`.
- **Info:**
  - Breadcrumb "Catálogo / {Categoría}" (`text-caption`, links `action`).
  - Nombre (`text-display-lg`, `brand`).
  - Descripción (`text-body`, `white-space: pre-line`).
  - Aviso informativo de entrega y anticipación.
- **Formulario "Agregar a mi cotización":** stepper, "Color de la vela" y "Color del listón" (inputs de texto opcionales), "Con aroma" (solo si `allowsFragrance`) y botón Primary Filled a todo el ancho. Al agregar, muestra un mensaje en línea (`role="status"`) "Agregado · Ver mi cotización".
- **Sin precios.** El texto de apoyo dice "Te enviamos el precio por WhatsApp".

### Cotización pública (`/cotizacion/:token`)
- Tarjeta `surface` centrada, de 720 px máx.
- Encabezado: folio (`text-heading`), badge de estado (`text-micro`) y vigencia.
- Tabla de renglones: hairlines `border`, cantidades y montos alineados a la derecha, montos con `Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN'})`.
- Totales en una columna a la derecha: el total en `text-heading-lg`, `brand`; el anticipo resaltado sobre `surface-tint`.
- Acciones: Primary Filled "Aceptar cotización" y Outlined "Rechazar".

## 5. Layout Principles

### Spacing System
Escala de Tailwind: 4 / 8 / 16 / 24 / 32 / 40 / 48 / 64 px. La unidad del sistema es 16 px (gutter
móvil y padding de tarjeta).

### Grid & Container
- Contenedor de 1200 px máx., centrado. Gutter lateral de 16 px en móvil, 24 px en tablet y 40 px en escritorio.
- Grid de productos: 2 columnas en móvil, 3 a partir de 768 px y 4 a partir de 1024 px, con gap de 16 px (24 px en escritorio).
- Hero: split 50/50 en escritorio (texto | foto); en móvil se apila con la foto arriba.
- No debe haber scroll horizontal a 375 px.

### Whitespace Philosophy
Las secciones van separadas por 64 px en móvil y 96 px en escritorio, y por color de fondo, nunca por divisores.

### Border Radius Scale
| Token | Valor | Uso |
|---|---|---|
| `--radius-card` (preset) | 16px | Tarjetas, carrusel, imágenes |
| `--radius-input` (preset) | 10px | Inputs, avisos |
| `9999px` | — | Botones, chips, badges |
| `50%` | — | Botón flotante, controles del carrusel, stepper |

## 6. Depth & Elevation

Sombras teñidas de ink en capas, igual que en el admin (`rgba(38,48,42,…)`):

| Token | Valor | Uso |
|---|---|---|
| `--shadow-card` | `0 0 0.5px rgba(38,48,42,.14), 0 1px 2px rgba(38,48,42,.12)` | Tarjetas |
| `--shadow-nav` | `0 1px 3px rgba(38,48,42,.08), 0 2px 2px rgba(38,48,42,.04)` | Header |
| `--shadow-float` | `0 0 6px rgba(38,48,42,.24), 0 8px 12px rgba(38,48,42,.14)` | Botón flotante |

Nunca una sola sombra pesada. Nunca degradados.

## 7. Do's and Don'ts

### Do
- Lienzo `canvas` y tarjetas `surface`.
- Cada verde en su rol: `action` solo para acción, `brand` para títulos y `band` para bandas.
- Botones pill y `active:scale-95` en todos.
- Mostrar el aviso de Durango y los días de anticipación en la barra superior, en el producto y en `/cotizar`.
- Leer ciudad, días, % de anticipo y contacto de `/public/settings`. Nunca escribirlos a mano.
- Fotos reales de producto como protagonistas.

### Don't
- No inventar colores ni usar crudos de Tailwind (`bg-green-700`, `text-gray-500`).
- No usar `action` como fondo decorativo ni en títulos.
- No usar Parisienne en más de una palabra por pantalla, ni en botones o párrafos.
- No mostrar precios en catálogo ni en producto.
- No usar degradados ni sombras pesadas.
- No poner `text-muted` sobre `canvas-deep`.
- No agregar librerías de UI ni de carrusel.

## 8. Responsive Behavior

### Breakpoints
| Nombre | Ancho | Cambios |
|---|---|---|
| base | < 768px | Menú `<details>`, grid de 2 columnas, hero apilado, botones del hero a todo el ancho |
| md | ≥ 768px | Links del nav visibles, grid de 3, hero en split |
| lg | ≥ 1024px | Grid de 4, PDP 55/45, escala display completa |
| xl | ≥ 1280px | Contenedor topado en 1200 px |

### Touch Targets
Todo lo clicable mide ≥ 44 px, excepto los puntos del carrusel, que llevan un área táctil de 24 px con padding.

### Collapsing Strategy
Hero y PDP se apilan. La banda "Cómo funciona" pasa de 5 columnas a 1. Los chips de categoría hacen
scroll horizontal. El footer pasa de 3 columnas a 1.

### Image Behavior
Se usan `width`/`height` o `aspect-ratio` explícitos para evitar saltos de layout, `loading="lazy"` excepto en el hero, y `decoding="async"`.

## 9. Agent Prompt Guide

### Quick Color Reference
- **CTA:** `bg-action text-surface`, hover `bg-action-hover`.
- **Títulos:** `text-brand` en Fraunces.
- **Banda y footer:** `bg-band text-on-band`, secundario `text-on-band-muted`.
- **Página:** `bg-canvas`. Tarjetas: `bg-surface`. Zona alterna: `bg-canvas-deep`.
- **Texto:** `text-text`; secundario `text-text-muted`.
- **Badge destacado:** `bg-action-soft text-brand`.
- **Error:** `text-danger-fg bg-danger-bg`.

### Secciones del negocio (obligatorias)
1. **Barra de aviso:** entrega solo en {city} y mínimo {N} días.
2. **Hero:** "Velas personalizadas para tus momentos especiales" + la palabra "hecho a mano" en Parisienne + foto de la galería + "Ver catálogo" + WhatsApp.
3. **Categorías.**
4. **Destacados.**
5. **Cómo funciona:** banda, políticas de `assets/Proceso de pedidos.png`.
6. **Nosotros:** texto provisional, marcado para la dueña.
7. **Galería.**
8. **Contacto:** WhatsApp, teléfono, email, horario, redes y ciudad.
9. **Catálogo por categorías.**
10. **Detalle con carrusel.**
11. **Mi cotización:** lista y formulario.
12. **Cotización pública por token.**

### Iteration Guide
1. Un componente a la vez.
2. Nombrar tokens semánticos, no hex.
3. Verificar a 375 px y a 1280 px.
4. Revisar que cada verde siga en su rol.

### Known Gaps
- La galería trae nombres reales de clientas; hay que confirmar el permiso antes de publicar.
- El texto de "Nosotros" es provisional.
- No hay estados de warning (no hacen falta).
