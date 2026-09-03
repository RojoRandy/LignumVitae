// Totales de una cotizacion (o de un pedido, misma forma). Reemplaza las
// columnas de la hoja "Ventas Enero" que usaban XLOOKUP contra el catalogo
// para traer el costo del dia en que se abre el archivo, no el costo del dia
// en que se vendio. Aqui todo el desglose se recibe ya calculado por
// renglon (calculateProductCost corrio antes, con el costo vigente en ese
// momento) y esta funcion solo agrega, aplica el bracket y redondea.
import { ceilToMultiple, money, round2 } from './money';
import { type PriceTier, resolvePriceTier } from './pricing';

export const AdjustmentType = { PERCENTAGE: 'PERCENTAGE', FIXED: 'FIXED' } as const;
export type AdjustmentType = (typeof AdjustmentType)[keyof typeof AdjustmentType];

export interface QuotationLineInput {
  productId: number;
  quantity: number;
  withFragrance: boolean;
  /** Ya calculado con calculateProductCost, prorationQuantity = quantity de este renglon. */
  unitTotalCost: number;
  /** Precio de lista del producto en cada bracket (Product.retailPriceOverride ?? retailListPrice). */
  retailPrice: number;
  wholesalePrice: number;
  /** Ajuste manual de esta cotizacion en particular. Se registra como varianza, nunca se pierde. */
  unitPriceOverride?: number | null;
}

export interface QuotationTotalsInput {
  items: QuotationLineInput[];
  wholesaleThresholdQty: number;
  fragranceSurcharge: number;
  shippingCost: number;
  discountEnabled: boolean;
  discountType: AdjustmentType;
  discountValue: number;
  depositPct: number;
  roundingMultiple: number;
}

export interface QuotationLineTotals {
  unitListPrice: number;
  unitPrice: number;
  /** unitPrice - unitListPrice - aroma. Alimenta el reporte de fuga de margen. */
  priceVariance: number;
  lineTotal: number;
  lineCost: number;
  lineMargin: number;
}

export interface QuotationTotals {
  priceTier: PriceTier;
  totalQuantity: number;
  items: QuotationLineTotals[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  depositAmount: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPct: number;
}

const applyAdjustment = (base: number, type: AdjustmentType, value: number) => {
  const raw =
    type === AdjustmentType.PERCENTAGE
      ? money(base).times(value).dividedBy(100)
      : money(value);
  // El descuento nunca puede ser negativo ni exceder el subtotal.
  return round2(raw).clamp(0, base);
};

export const calculateQuotationTotals = (input: QuotationTotalsInput): QuotationTotals => {
  const totalQuantity = input.items.reduce((acc, item) => acc + item.quantity, 0);
  // El bracket se resuelve UNA vez para TODO el pedido, no por renglon.
  const priceTier = resolvePriceTier(totalQuantity, input.wholesaleThresholdQty);

  const items: QuotationLineTotals[] = input.items.map((item) => {
    const unitListPrice = priceTier === 'WHOLESALE' ? item.wholesalePrice : item.retailPrice;
    const base = item.unitPriceOverride ?? unitListPrice;
    const fragranceCharge = item.withFragrance ? input.fragranceSurcharge : 0;
    const unitPrice = round2(money(base).plus(fragranceCharge));
    const priceVariance = round2(money(base).minus(unitListPrice));
    // Redondeo POR RENGLON, antes de sumar: si se suma primero y se redondea
    // al final, el total no cuadra contra el desglose que el cliente ya vio
    // impreso en el PDF.
    const lineTotal = round2(unitPrice.times(item.quantity));
    const lineCost = round2(money(item.unitTotalCost).times(item.quantity));
    const lineMargin = lineTotal.minus(lineCost);

    return {
      unitListPrice: round2(unitListPrice).toNumber(),
      unitPrice: unitPrice.toNumber(),
      priceVariance: priceVariance.toNumber(),
      lineTotal: lineTotal.toNumber(),
      lineCost: lineCost.toNumber(),
      lineMargin: lineMargin.toNumber(),
    };
  });

  const subtotal = items.reduce((acc, item) => acc.plus(item.lineTotal), money(0));
  const discountAmount = input.discountEnabled
    ? applyAdjustment(subtotal.toNumber(), input.discountType, input.discountValue)
    : money(0);
  const shippingCost = round2(input.shippingCost);
  const total = round2(subtotal.minus(discountAmount).plus(shippingCost));
  // El anticipo se redondea SIEMPRE hacia arriba: nunca cobrar de menos un
  // anticipo. OJO: no se debe redondear a 2 decimales ANTES de ceilToMultiple
  // (round2(4.004) = 4.00 ya pierde los $0.004 que justifican redondear hacia
  // arriba) — se le pasa el importe crudo y ceilToMultiple hace su propio
  // redondeo al final.
  const depositAmount = ceilToMultiple(
    total.times(input.depositPct).dividedBy(100),
    input.roundingMultiple,
  );

  const totalCost = items.reduce((acc, item) => acc.plus(item.lineCost), money(0));
  // El flete NO entra al costo: es un traspaso al paquetero, no algo que se produce.
  const grossProfit = round2(subtotal.minus(discountAmount).minus(totalCost));
  const taxableBase = subtotal.minus(discountAmount);
  const grossMarginPct = taxableBase.greaterThan(0)
    ? round2(grossProfit.dividedBy(taxableBase).times(100))
    : money(0);

  return {
    priceTier,
    totalQuantity,
    items,
    subtotal: round2(subtotal).toNumber(),
    discountAmount: discountAmount.toNumber(),
    shippingCost: shippingCost.toNumber(),
    total: total.toNumber(),
    depositAmount: depositAmount.toNumber(),
    totalCost: round2(totalCost).toNumber(),
    grossProfit: grossProfit.toNumber(),
    grossMarginPct: grossMarginPct.toNumber(),
  };
};
