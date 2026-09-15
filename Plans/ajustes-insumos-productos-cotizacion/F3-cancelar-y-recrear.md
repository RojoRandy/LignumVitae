# F3 · Cancelar y recrear una compra (decisión cerrada)

Insumo de F4 (API) y F5 (admin).

## Qué escribe hoy `create()` — el inventario de lo que hay que revertir

`purchases.service.ts:53-175`, todo dentro de una transacción:

| # | Escritura | Renglón que la provoca |
|---|---|---|
| 1 | `purchase` | siempre |
| 2 | `purchase_item` | uno por renglón |
| 3 | `asset` **creado** | `ASSET` sin `assetId` |
| 4 | `asset.quantity` / `totalCost` **incrementado** | `ASSET` con `assetId` |
| 5 | `stock_movement` (+) y `Supply.stockQty` recalculado | `SUPPLY` |
| 6 | `expense` (`source: PURCHASE`, `refType: 'purchase_item'`) | `EXPENSE` |
| 7 | `Supply.suggestedUnitCost` recalculado, fuera de la transacción | `SUPPLY` |

El `deactivate` actual (`:177-189`) sólo revierte **5**. Quedan vivos el activo,
el gasto del mes y un costo sugerido que ya no corresponde a ninguna compra real.

## Qué revierte exactamente la cancelación

En una sola transacción, en este orden:

1. `purchase.isActive = false`.
2. **Stock** — como hoy: los `stock_movement` con
   `refType='purchase_item' AND refId IN (items)` pasan a `isActive=false` y se
   llama `recalculateStock` por insumo. (`stockQty` es derivado de
   `SUM(movimientos activos)` por diseño — `schema.prisma:459-461` —, así que
   esto no puede descuadrar.)
3. **Gastos** — los `expense` con el mismo `refType`/`refId` pasan a
   `isActive=false`. Baja lógica, igual que todo lo demás; no se borra el
   renglón para que el histórico del mes siga siendo auditable.
4. **Activos** — por cada `purchase_item` de tipo `ASSET` con `assetId`:
   - se **decrementa** `quantity` en `round(packsQty)` y `totalCost` en `lineTotal`
     — exactamente lo que ese renglón sumó;
   - si después del decremento **no queda ningún `purchase_item` activo** apuntando
     a ese activo, el activo se da de baja (`isActive = false`).

   Una sola rama cubre los dos casos: el activo **creado** por esta compra se
   queda en `quantity = 0`, `totalCost = 0` y `isActive = false`; el activo
   **incrementado** vuelve a los números que tenía antes y sigue vivo. No hace
   falta columna nueva ni distinguir "creado" de "incrementado" en la base.

5. Fuera de la transacción, `recalculateSuggestedCost` de cada insumo afectado —
   lo mismo que hace `create()` al final (`:172`).

**`Supply.currentUnitCost` no se toca.** Sólo se mueve con el botón "Aplicar", y
así se queda (lo dice el plan en F4).

**Cancelar dos veces no revierte dos veces.** Si la compra ya está
`isActive = false`, `deactivate` devuelve la compra sin escribir nada. Sin esto,
un doble click decrementa el activo dos veces y el número queda en negativo.

## El mes cerrado bloquea

Antes de cancelar o de editar se busca el `OverheadPeriod` del año y mes de
`purchase.purchasedAt`. Si existe y tiene `closedAt != null` → **400
`PERIOD_CLOSED`**, con el año y el mes en el `data` del error, y nada se escribe.

Razón: el cierre congela `expenseTotal` y el `ratePerMinute` con el que ya se
costearon pedidos de ese mes (`schema.prisma:690-720`). Revertir un gasto de un
mes cerrado dejaría el cierre mintiendo.

En una **edición**, se comprueban **los dos meses**: el de la compra original y el
de la compra corregida. Si la corrección mueve la fecha a otro mes y ese mes está
cerrado, también es 400.

## La edición: `PATCH /purchases/:id`

Toma el mismo cuerpo que `POST /purchases` (`CreatePurchaseDto` completo, no un
diff de renglones) y, **en una sola transacción**:

1. valida los dos meses (arriba);
2. cancela la compra original con la reversión completa de arriba;
3. crea la compra corregida reusando la lógica de `create()` —no se duplica el
   cálculo de prorrateo, costo base ni movimientos;
4. devuelve la compra nueva.

**Folio nuevo.** La compra corregida toma el siguiente folio del contador, como
cualquier compra. No se reusa el de la cancelada: el contador es secuencial
global (`FolioCounter`) y reciclarlo obliga a manipularlo hacia atrás, que es
justo lo que "NO debe cambiar la generación de folios" prohíbe. La cancelada
queda visible como inactiva, con su folio, y sirve de rastro de la corrección.

Si la transacción falla a medias, no queda ni la cancelación ni la compra nueva.

## Lo que esta decisión NO trae

- **Sin columna que enlace la compra corregida con la cancelada.** Si algún día
  hace falta la trazabilidad explícita, es una migración de una columna; hoy no
  la pide nadie.
- **Sin reabrir un mes cerrado** desde compras.
- **Sin recalcular `OverheadPeriod`** del mes abierto tras la reversión: ese
  recálculo ya existe donde vive el cierre mensual y no se toca desde aquí.
