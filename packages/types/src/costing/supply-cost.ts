// Costo sugerido de un insumo, derivado de compras reales. Reemplaza el
// `=143.45/3` y el `=1978/2` que la clienta calculaba a mano en la celda de
// Costo cada vez que compraba un paquete.
import { money, round2, round6 } from './money';

export interface PurchaseSample {
  purchasedAt: string; // ISO
  /** En unidad base del insumo. */
  baseQuantity: number;
  /** lineTotal + flete prorrateado de esa compra. */
  landedTotal: number;
}

export interface SuggestSupplyCostInput {
  samples: PurchaseSample[];
  asOf: string; // ISO
  /** Settings.supplyCostWindowDays (180): compras mas viejas no cuentan. */
  windowDays: number;
  /** Settings.supplyCostMaxSamples (5): cuantas compras recientes como maximo. */
  maxSamples: number;
}

export interface SuggestedSupplyCost {
  unitCost: number | null;
  sampleSize: number;
  oldestSampleAt: string | null;
  method: 'WEIGHTED_AVG' | 'NONE';
}

/**
 * Promedio ponderado por CANTIDAD de las compras recientes, no promedio
 * simple. Si compro dos bultos de 20 kg a $1,978 y manana compra 1 kg suelto
 * a $130 porque se le acabo la cera, el promedio simple diria $114.50/kg
 * (+16%, encareceria todo el catalogo por una compra de emergencia); el
 * ponderado dice $99.66/kg, que es la economia real del negocio.
 */
export const suggestSupplyUnitCost = (input: SuggestSupplyCostInput): SuggestedSupplyCost => {
  const asOfMs = new Date(input.asOf).getTime();
  const windowMs = input.windowDays * 24 * 60 * 60 * 1000;

  const inWindow = input.samples
    .filter((s) => asOfMs - new Date(s.purchasedAt).getTime() <= windowMs)
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
    .slice(0, input.maxSamples);

  if (inWindow.length === 0) {
    return { unitCost: null, sampleSize: 0, oldestSampleAt: null, method: 'NONE' };
  }

  const totalQty = inWindow.reduce((acc, s) => acc.plus(s.baseQuantity), money(0));
  const totalCost = inWindow.reduce((acc, s) => acc.plus(s.landedTotal), money(0));

  const unitCost = totalQty.greaterThan(0) ? round6(totalCost.dividedBy(totalQty)) : null;
  const oldest = inWindow.reduce((min, s) => (s.purchasedAt < min ? s.purchasedAt : min), inWindow[0].purchasedAt);

  return {
    unitCost: unitCost ? unitCost.toNumber() : null,
    sampleSize: inWindow.length,
    oldestSampleAt: oldest,
    method: 'WEIGHTED_AVG',
  };
};

/**
 * Prorratea el flete de una compra entre sus renglones SUPPLY, por
 * participacion en el importe. El residuo de centavos por redondeo va al
 * renglon de mayor importe para que la suma cuadre exacto.
 */
export const prorateShipping = (lineTotals: number[], shippingCost: number): number[] => {
  const total = lineTotals.reduce((acc, v) => acc.plus(v), money(0));
  if (total.lessThanOrEqualTo(0) || money(shippingCost).lessThanOrEqualTo(0)) {
    return lineTotals.map(() => 0);
  }

  const allocations = lineTotals.map((lt) => round2(money(lt).dividedBy(total).times(shippingCost)));
  const allocatedSum = allocations.reduce((acc, v) => acc.plus(v), money(0));
  const residual = round2(money(shippingCost).minus(allocatedSum));

  if (!residual.equals(0) && allocations.length > 0) {
    const maxIdx = lineTotals.reduce((best, v, i) => (v > lineTotals[best] ? i : best), 0);
    allocations[maxIdx] = allocations[maxIdx].plus(residual);
  }

  return allocations.map((a) => a.toNumber());
};
