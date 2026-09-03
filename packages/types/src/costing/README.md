# Motor de costos y precios

Funciones puras (sin base de datos, sin `Date.now()`, sin NestJS) que calculan
el costo y el precio de un producto de Lignum Vitae. Las usa `apps/api` como
fuente de verdad — el servidor SIEMPRE recalcula, nunca confia en lo que
llega en el request — y `apps/admin` para previsualizar en vivo mientras se
edita un producto o una cotizacion.

## Por que tres precisiones de Decimal, y no una sola

El repo de referencia (Agencia) usa `Decimal(12,2)` para todo el dinero. Aqui
se desvia a proposito:

| Precision | Para que | Por que |
|---|---|---|
| `Decimal(12,2)` / `round2` | Lo que se COBRA o se PAGA: precios, totales, abonos | Es la unidad minima de un peso mexicano; no tiene sentido cobrar fracciones de centavo. |
| `Decimal(14,6)` / `round6` | Costos unitarios y tasas: $/gramo, $/minuto | La cera cuesta **$0.0989/g**. A 2 decimales se redondea a $0.10 y encarece **1.1%** los 113 modelos del catalogo — la cera es el 55% del costo de insumos, asi que ese redondeo no es ruido. |
| `Decimal(14,3)` / `round3` | Cantidades y existencias en unidad base | Gramos, mililitros y piezas fraccionarias (0.25 pliegos de papel) necesitan mas que enteros. |

La regla "dinero = 2 decimales" aplica a lo que se cobra, no a las tasas con
las que se calcula. Mezclarlas es precisamente el bug que tenia el Excel.

## Que reemplaza cada archivo

| Archivo | Reemplaza en el Excel |
|---|---|
| `product-cost.ts` | Columnas D-Y de la hoja "Catalogo" (costo de un modelo) |
| `pricing.ts` | Columnas Z, AA, AC, AD (precio sugerido y de catalogo) |
| `overhead.ts` | La celda `U` (gastos indirectos, constante $2.50 capturada a mano) |
| `quotation.ts` | La hoja "Ventas Enero" (una fila = un renglon de pedido, con XLOOKUP al catalogo) |
| `supply-cost.ts` | La celda `Costo` de "Compras Insumos Enero" (`=143.45/3` a mano) |

## Reglas que no tienen excepcion

- La cera **nunca** es un `ProductSupply`. Se deriva de `Candle.grams x waxUnitCost`.
- El precio se fija con **markup sobre costo**, nunca con margen sobre precio
  (el margen es el piso del override manual, no la forma de fijar el precio).
- El precio sugerido se redondea **siempre hacia arriba**.
- El importe de cada renglon de una cotizacion se redondea **antes** de sumar.
- El bracket de menudeo/mayoreo se resuelve **una sola vez**, sobre la
  cantidad acumulada de todo el pedido.
