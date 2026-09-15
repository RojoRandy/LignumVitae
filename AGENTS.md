# Instrucciones para Codex

Claude te delega construcción repetitiva, refactors grandes y errores atorados. No decides el alcance de la tarea; lo decide Claude antes de pasártela.

Todo lo que produces aquí lo revisa Claude antes de darse por bueno. No hagas commit ni push por tu cuenta.

Sigue el estilo y las convenciones ya presentes en el código que tocas. No agregues dependencias, abstracciones ni configuración que no se te pidan.

Si la tarea no es clara o te quedas atorado, dilo en vez de improvisar una solución grande.

## Reglas duras del portal admin (apps/admin)

No las negocies. Si una tarea parece pedirte romper una, dilo en vez de romperla.

**Color.** Nunca inventes un color. Todo sale de los tokens semanticos de
`apps/admin/src/styles/tokens.css` (`text-text-muted`, `bg-surface-sunken`,
`border-border`, `text-danger-fg`...). Si necesitas un token que no existe, dilo
— no escribas un hex ni uses un color crudo de Tailwind. La paleta de marca vive
en `packages/tailwind-preset/brand.json` y no se edita.

**Tipografia.** Usa la escala del proyecto: `text-micro`, `text-caption`,
`text-body-sm`, `text-body`, `text-body-lg`, `text-heading-sm`, `text-heading`,
`text-heading-lg`, `text-display-lg`. Nunca `text-xs`, `text-sm`, `text-base`,
`text-lg` de Tailwind, ni tamanos arbitrarios tipo `text-[10px]`.

**Composicion.** Las paginas se arman con las primitivas de
`apps/admin/src/components/ui/page.tsx` (`PageHeader`, `PageToolbar`,
`PageState`, `FormError`, `ReadonlyAmount`) y con los componentes de
`apps/admin/src/components/ui/`. No copies el encabezado ni la toolbar de la
pagina vecina: esa duplicacion es justo lo que estamos quitando.

**Accesibilidad.** Todo boton de solo icono lleva `aria-label`. Nada clicable
vive en un `<div>` o un `<li>`: usa `<button>`. No quites el anillo de foco.

**React.** Nunca definas un componente dentro de otro componente — se remonta
todo su subarbol en cada render. Deriva estado durante el render, no con un
`useEffect` que hace `setState`. Ver la skill `vercel-react-best-practices` en
`.agents/skills/`, prioridad 5.

**Alcance.** Sin dependencias nuevas. Sin abstracciones que no se te pidieron.
Sin endpoints nuevos en la API. El diff mas corto que resuelva el problema.
