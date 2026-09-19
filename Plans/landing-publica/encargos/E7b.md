# Encargo a Codex — E7b (corrección: colisión de nombres color/tipografía en la landing)

Lee `AGENTS.md` en la raíz ANTES de tocar nada. No hagas commit ni push. Sin dependencias nuevas.
Si algo no está claro, dilo en vez de improvisar.

## El problema
En Tailwind v4, `--color-X` y `--text-X` generan la MISMA clase `text-X`. En `apps/landing/src/styles/global.css`
existen `--color-heading` y `--text-heading`, y `--color-accent` y `--text-accent`. Resultado:
- `text-heading` pone tamaño Y color moss-800: el nombre de marca del footer queda verde oscuro sobre la banda verde oscuro (ilegible).
- `text-accent` pone color teal Y la fuente Parisienne: el link "Saltar al contenido" sale en letra cursiva.

`apps/landing/DESIGN.md` ya se actualizó (ver la nota al inicio de la sección 2): los COLORES se renombran y la escala
tipográfica conserva sus nombres.

## La tarea
- **Archivo principal:** `apps/landing/src/styles/global.css`.
- **Secundario:** `apps/landing/src/layouts/Layout.astro` (y `src/pages/index.astro` si usa alguno).
- **Renombres, solo de COLOR** (en `:root`, en `@theme inline` y en todos los usos: clases `text-*`, `bg-*`, `border-*`, `hover:*`, `var(--color-*)`):
  - `--color-accent` → `--color-action`
  - `--color-accent-hover` → `--color-action-hover`
  - `--color-accent-soft` → `--color-action-soft`
  - `--color-heading` → `--color-brand`
- **NO cambia:** los tokens de tipografía (`--text-heading*`, `--text-accent`, etc.), `--font-accent`, `packages/tailwind-preset`, el admin ni la API. Ningún hex nuevo.
- Donde un elemento usaba `text-heading` o `text-accent` buscando COLOR, pasa a `text-brand` / `text-action`. Donde lo usaba buscando TAMAÑO, se queda.
- El nombre de marca del footer debe verse en `on-band`; el link "Saltar al contenido" en Jost con color `action`.

## Comprobación
- `grep -rnE "color-accent|color-heading|(bg|border|text)-accent-(soft|hover)" apps/landing/src` no encuentra nada.
- `pnpm --filter @lignumvitae/landing build` pasa (las dependencias YA están instaladas; no corras `pnpm install`).
- Si puedes: con `pnpm dev:landing`, el nombre del footer se lee sobre la banda.

## Al terminar
Reporta: archivos tocados, comprobaciones corridas con su resultado literal y lo que no pudiste comprobar.
