# C1 · Cómo se ve la herencia de insumos en el producto (decisión cerrada)

Insumo de C3 (el asistente) y complemento de C2 (la API).

## El problema real

El servidor **ya** copia a `ProductSupply` los insumos de la plantilla de la vela,
del empaque y de la tarjeta (`products.service.ts:215-251`, con
`source = CANDLE_TEMPLATE | PACKAGING_TEMPLATE | CARD_TEMPLATE`). El asistente
nunca los enseña. Por eso el usuario vuelve a capturar el celofán que ya estaba
heredado y siente que el sistema "duplica".

## De dónde salen los datos: de ninguna query nueva

El asistente ya pide las tres listas completas con sus plantillas incluidas:

- `GET /candles?limit=200` → `candle.supplyTemplate[].supply` (`candle.repository.ts:11`)
- `GET /packaging-types?limit=100` → idem (`packaging-type.repository.ts:5`)
- `GET /card-types?limit=100` → idem (`card-type.repository.ts:5`)

`ProductWizardPage.tsx:80-91` ya tiene las tres en memoria. **La lista de
heredados se deriva durante el render** de la vela/empaque/tarjeta seleccionados.
Sin endpoint nuevo, sin `useQuery` nuevo, sin `useEffect`.

## Cómo se presenta

Una sola `Card` nueva titulada **"Insumos"**, al final de la columna izquierda del
formulario (después de la tarjeta de empaque/tarjeta, antes del botón de guardar),
con dos partes en este orden:

### 1. "Vienen incluidos" — sólo lectura

Lista plana, un renglón por insumo, **agrupada por origen** con un `Badge` por
renglón que dice de dónde viene: `Vela`, `Empaque` o `Tarjeta`. Cada renglón
muestra: nombre del insumo · cantidad con la abreviatura de su unidad · el badge.
Nada editable, ningún control, ningún botón de quitar — se cambian cambiando la
vela, el empaque o la tarjeta, que es exactamente lo que hace el servidor.

Cuando no hay nada heredado (empaque "Sola" sin plantilla), la sección no se
dibuja en absoluto; no se pone un estado vacío.

**BOUQUET:** con C2 el ramo hereda la plantilla de *cada* vela que lo compone. El
badge dice `Vela` igual, y si dos velas del ramo traen el mismo insumo aparece
**un solo renglón** — porque eso es lo que el servidor guarda (dedupe por
`supplyId`, gana el último; ver "precedencia" abajo).

### 2. "Insumos adicionales" — editable

El `SupplyTemplateEditor` que ya usan velas, empaques y tarjetas
(`components/domain/supply-template-editor.tsx`), sin modificarlo. Su array
alimenta `additionalSupplies` en `previewInput` y en el guardado.

## Qué pasa si alguien agrega como adicional un insumo que ya viene heredado

**Se avisa, no se bloquea.** Regla: el servidor ya resuelve el choque —
`bySupplyId` en `products.service.ts:255` se queda con el **último**, y los
manuales se empujan después de las plantillas (`:253`), así que **el adicional
manual gana y sustituye a la cantidad heredada**. No se suman. Ese comportamiento
no cambia (el plan lo prohíbe explícitamente en C2).

Lo único que cambia es que deje de ser invisible: si un renglón del editor de
adicionales elige un insumo que también está en la lista heredada, ese renglón
muestra una nota corta debajo — *"Ya viene del empaque; esta cantidad reemplaza a
la heredada"* — usando el token de texto atenuado. Es texto, no un bloqueo ni un
diálogo.

La cera es la única excepción dura: `useSupplyOptions()` sin `includeWax` ya la
saca de la lista del editor, y C2 agrega el rechazo en la API
(`SUPPLY_IS_WAX`) para el caso de que llegue por otra vía.

## Lo que esta decisión NO trae

- **Sin editar un heredado desde el producto.** Si la cantidad de celofán está
  mal, se arregla en el empaque y se arregla para todos los productos que lo usan
  — que es el punto de las plantillas.
- **Sin "desheredar"** un insumo puntual en un producto.
- **Sin componente nuevo reutilizable:** la lista de heredados es marcado dentro
  de `ProductWizardPage.tsx`. Si algún día la pide otra pantalla, se extrae
  entonces. (Y nunca definida dentro del componente: si necesita nombre, va al
  nivel de módulo del archivo.)
