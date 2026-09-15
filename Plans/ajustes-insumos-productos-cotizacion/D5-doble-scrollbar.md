# D5 · Reproducción del doble scrollbar (medido en el navegador)

Hecho sobre la app corriendo (`vite` en 5173 + API en 3000), midiendo el DOM, no
leyendo el código. **La hipótesis que traía el plan resultó falsa.**

## Lo que el plan suponía

> "…si el desplazamiento del layout viene del `padding-right` que Radix mete en
> `body` al abrir un diálogo (el `body` nunca fue el scroller, así que ese
> bloqueo no sirve de nada y sí empuja la página)."

**Descartado por medición.** Con el diálogo de "Nuevo insumo" abierto:

```
bodyOv: "hidden"      ← Radix sí bloquea el body
bodyPR: "0px"         ← pero NO añade padding-right
bodyStyleAttr: "pointer-events: none;"
mainScrollTop tras rodar la rueda: 0   ← el fondo no se desplaza
```

Radix calcula el `padding-right` a partir del ancho de la barra del `body`, y
como el `body` no tiene barra (el shell es `h-dvh`, `documentElement.scrollHeight
=== clientHeight === 900`), ese valor es 0. La página **no** se empuja. Es cierto
que el bloqueo de scroll apunta al elemento equivocado, pero en la práctica no
hace daño: Radix además intercepta la rueda sobre el overlay, así que el fondo
tampoco se mueve.

## Las dos barras reales

### 1. El contenedor de la tabla — el que sale en pantallas normales

En `/insumos` a 1440x900, dos scrollers verticales a la vez:

```
MAIN :: flex-1 overflow-y-auto p-4 md:p-7            :: 1154/900   ← correcta
DIV  :: w-full overflow-x-auto rounded-card border…  ::  955/949   ← la de más
```

El segundo es el contenedor de `components/ui/data-table.tsx`. Lleva
`overflow-x-auto` para que una tabla ancha se pueda arrastrar en horizontal —
pero **CSS no permite `overflow-x: auto` junto a `overflow-y: visible`**: el
navegador promueve el eje Y a `auto`. Comprobado en vivo:

```
overflowX: "auto"   ·   overflowY computado: "auto"   ← nadie lo escribió
```

Así que ese contenedor es un scroller vertical accidental, y basta con que su
contenido lo exceda por 6 px (bordes, `rounded-card`, redondeo de alturas de
fila) para que el navegador dibuje una barra completa pegada al borde derecho de
la tarjeta, a cuatro píxeles de la barra de `main`. Es el doble scrollbar que se
ve en el portal.

Sale en **todas** las páginas con tabla, porque todas pasan por el mismo
componente: insumos, clientes, compras, cotizaciones, productos.

### 2. El `nav` del sidebar — sólo en ventanas bajas

```
NAV :: flex flex-1 flex-col gap-6 overflow-y-auto px-2.5 py-5 :: 669/560
```

A 900 px de alto no aparece; a 700 px sí, porque el menú (11 entradas + los tres
encabezados de sección) mide 669 px. Es una barra legítima —el menú no cabe— y
vive pegada al borde del sidebar. Cuando coincide con la de `main`, se ven dos
barras verticales al mismo tiempo, que es lo que se aprecia en una ventana no
maximizada o en un portátil de 768 px.

## Qué cambia esto para D6

El alcance previsto en el plan era reescribir el shell de `AppLayout.tsx` para
que el documento fuera el único scroller y el sidebar quedara `sticky`. Eso
atacaba la hipótesis de Radix, que resultó no ser el problema — y no arreglaría
ninguna de las dos barras reales: la del `data-table` seguiría igual, y el
sidebar seguiría necesitando su propia barra cuando el menú no cabe.

El arreglo que sí corresponde a lo medido es de **una clase** y ya está aplicado
(ver abajo). `AppLayout.tsx` no se tocó.

## D6 · Lo que se hizo, y la comprobación

`apps/admin/src/components/ui/table.tsx`: el contenedor pasa de
`overflow-x-auto` a `overflow-x-auto overflow-y-clip`. `clip` corta el eje Y sin
crear un scroll container, así que el eje X sigue arrastrándose igual y el Y deja
de inventarse una barra. Al ser el componente por el que pasan las 14 listas del
portal, se arregla en todas de una vez.

No recorta nada: la última fila termina 0.8 px **antes** del borde del
contenedor (`tablaH === clientHeight === 949`); los 6 px de `scrollHeight` eran
un artefacto de layout, no contenido.

Medido después del cambio, a 1440x900:

| página | scrollers verticales | antes |
|---|---|---|
| `/insumos` | sólo `MAIN` | `MAIN` + el de la tabla |
| `/clientes` | ninguno | — |
| `/cotizaciones` | ninguno | — |
| `/compras` | ninguno, y `overflow-x` sigue en `auto` | — |

La barra del `nav` del sidebar en ventanas bajas **se deja como está**: es
legítima (el menú mide 669 px y no cabe en 560), vive dentro del sidebar y
quitarla obligaría a que el sidebar dejara de ser fijo, que es justo lo que el
plan prohíbe cambiar.
