// Precio sugerido y resolucion del bracket menudeo/mayoreo.
//
// Se fija el precio con MARKUP sobre costo (costo x 1.5), no con margen sobre
// precio (costo / (1 - 0.33)), porque es la operacion que el negocio ya hace
// y entiende ("le subo uno punto cinco"). El margen sobre precio es la forma
// correcta de fijar un objetivo de resultado, no el precio de una pieza:
// `costo/(1-m)` explota cuando m->1 y no se puede razonar de cabeza. Los dos
// numeros se calculan y se muestran siempre juntos, nunca por separado, y
// jamas se le llama "utilidad" a un markup: "50% de utilidad" en el Excel es
// en realidad un margen del 33.3%.
import { ceilToMultiple, money, round2 } from './money';

export const PriceTier = { RETAIL: 'RETAIL', WHOLESALE: 'WHOLESALE' } as const;
export type PriceTier = (typeof PriceTier)[keyof typeof PriceTier];

/**
 * El bracket se resuelve UNA vez, sobre la cantidad ACUMULADA de todo el
 * pedido. Un pedido de 31 + 31 piezas de dos modelos distintos es mayoreo en
 * los dos renglones. En enero esta regla no se aplicaba de facto (ver
 * comparativo de precios).
 */
export const resolvePriceTier = (totalOrderQuantity: number, wholesaleThresholdQty: number): PriceTier =>
  totalOrderQuantity >= wholesaleThresholdQty ? PriceTier.WHOLESALE : PriceTier.RETAIL;

/** "50% de utilidad" es markup 50% = margen 33.3%. Nunca se mezclan los dos otra vez. */
export const marginFromMarkup = (markupPct: number): number =>
  round2(money(markupPct).dividedBy(money(100).plus(markupPct)).times(100)).toNumber();

export const markupFromMargin = (marginPct: number): number =>
  round2(money(marginPct).dividedBy(money(100).minus(marginPct)).times(100)).toNumber();

export interface PricingPolicy {
  retailMarkupPct: number;
  wholesaleMarkupPct: number;
  roundingMultiple: number;
  minMarginPct?: number;
}

export interface TierPrice {
  /** costo x (1 + markup/100), SIN redondear. */
  rawPrice: number;
  /** Precio con piso de margen, redondeado siempre HACIA ARRIBA al multiplo. */
  suggestedPrice: number;
  /** Indica si el piso de margen elevo el precio sugerido final. */
  floorApplied: boolean;
  markupPct: number;
  /** Margen sobre el precio YA redondeado, para que la UI no muestre dos numeros que no cuadran. */
  marginPct: number;
}

export interface SuggestedPrices {
  retail: TierPrice;
  wholesale: TierPrice;
}

const buildTierPrice = (
  unitTotalCost: number,
  markupPct: number,
  roundingMultiple: number,
  minMarginPct?: number,
): TierPrice => {
  // [Excel: Z = Y*1.5+1  (menudeo, con el "+1" de aroma escondido)
  //         AC = Y*1.4     (mayoreo, sin el "+1")]
  // Aqui no hay "+1": el aroma es un renglon explicito de la cotizacion.
  const rawPrice = money(unitTotalCost).times(money(1).plus(money(markupPct).dividedBy(100)));
  const markupPrice = ceilToMultiple(rawPrice, roundingMultiple);
  let suggestedPrice = markupPrice;
  if (minMarginPct !== undefined && money(minMarginPct).greaterThan(0) && money(minMarginPct).lessThan(100)) {
    const floorPrice = money(unitTotalCost).dividedBy(money(1).minus(money(minMarginPct).dividedBy(100)));
    suggestedPrice = ceilToMultiple(floorPrice.greaterThan(rawPrice) ? floorPrice : rawPrice, roundingMultiple);
  }
  const marginPct = suggestedPrice.greaterThan(0)
    ? round2(suggestedPrice.minus(unitTotalCost).dividedBy(suggestedPrice).times(100))
    : money(0);

  return {
    rawPrice: round2(rawPrice).toNumber(),
    suggestedPrice: suggestedPrice.toNumber(),
    floorApplied: suggestedPrice.greaterThan(markupPrice),
    markupPct,
    marginPct: marginPct.toNumber(),
  };
};

export const suggestPrices = (unitTotalCost: number, policy: PricingPolicy): SuggestedPrices => ({
  retail: buildTierPrice(unitTotalCost, policy.retailMarkupPct, policy.roundingMultiple, policy.minMarginPct),
  wholesale: buildTierPrice(unitTotalCost, policy.wholesaleMarkupPct, policy.roundingMultiple, policy.minMarginPct),
});

export interface MinMarginCheck {
  ok: boolean;
  marginPct: number;
  /** El precio minimo que respeta el piso de margen, ya redondeado hacia arriba. */
  minPrice: number;
}

/** Guard del override manual de precio: no se puede fijar un precio por debajo del piso de margen. */
export const validateMinMargin = (
  price: number,
  unitTotalCost: number,
  minMarginPct: number,
): MinMarginCheck => {
  const marginPct = money(price).greaterThan(0)
    ? round2(money(price).minus(unitTotalCost).dividedBy(price).times(100))
    : money(0);
  // minPrice = costo / (1 - margen/100) — aqui SI es correcto usar margen
  // sobre precio, porque estamos fijando un piso de resultado, no un precio.
  const minPrice = round2(money(unitTotalCost).dividedBy(money(1).minus(money(minMarginPct).dividedBy(100))));

  return {
    ok: marginPct.greaterThanOrEqualTo(minMarginPct),
    marginPct: marginPct.toNumber(),
    minPrice: minPrice.toNumber(),
  };
};
