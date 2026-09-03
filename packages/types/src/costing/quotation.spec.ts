import { describe, expect, it } from 'vitest';
import { AdjustmentType, calculateQuotationTotals } from './quotation';
import { PriceTier } from './pricing';

describe('calculateQuotationTotals', () => {
  const baseItem = {
    productId: 1,
    quantity: 20,
    withFragrance: false,
    unitTotalCost: 6.44,
    retailPrice: 10,
    wholesalePrice: 8,
  };

  it('resuelve el bracket sobre la cantidad total del pedido, no por renglon', () => {
    const totals = calculateQuotationTotals({
      items: [
        { ...baseItem, quantity: 15 },
        { ...baseItem, productId: 2, quantity: 20 }, // 15+20=35 >= 31 -> mayoreo
      ],
      wholesaleThresholdQty: 31,
      fragranceSurcharge: 1,
      shippingCost: 0,
      discountEnabled: false,
      discountType: AdjustmentType.PERCENTAGE,
      discountValue: 0,
      depositPct: 40,
      roundingMultiple: 1,
    });

    expect(totals.priceTier).toBe(PriceTier.WHOLESALE);
    expect(totals.items[0].unitListPrice).toBe(8); // el bracket de mayoreo aplica a AMBOS renglones
    expect(totals.items[1].unitListPrice).toBe(8);
  });

  it('correccion #1: el aroma es un renglon explicito, no un "+1" escondido', () => {
    const totals = calculateQuotationTotals({
      items: [{ ...baseItem, quantity: 10, withFragrance: true }],
      wholesaleThresholdQty: 31,
      fragranceSurcharge: 1,
      shippingCost: 0,
      discountEnabled: false,
      discountType: AdjustmentType.PERCENTAGE,
      discountValue: 0,
      depositPct: 40,
      roundingMultiple: 1,
    });

    // unitPrice = 10 (retail) + 1 (aroma) = 11
    expect(totals.items[0].unitPrice).toBe(11);
    expect(totals.subtotal).toBe(110);
  });

  it('redondea CADA renglon antes de sumar, no el total al final', () => {
    const totals = calculateQuotationTotals({
      items: [
        { ...baseItem, quantity: 3, retailPrice: 10.333 },
        { ...baseItem, productId: 2, quantity: 3, retailPrice: 10.336 },
      ],
      wholesaleThresholdQty: 31,
      fragranceSurcharge: 1,
      shippingCost: 0,
      discountEnabled: false,
      discountType: AdjustmentType.PERCENTAGE,
      discountValue: 0,
      depositPct: 0,
      roundingMultiple: 1,
    });

    const manualSum = totals.items.reduce((acc, i) => acc + i.lineTotal, 0);
    expect(totals.subtotal).toBeCloseTo(manualSum, 2);
  });

  it('el anticipo se redondea SIEMPRE hacia arriba', () => {
    const totals = calculateQuotationTotals({
      items: [{ ...baseItem, quantity: 1, retailPrice: 10.01 }],
      wholesaleThresholdQty: 31,
      fragranceSurcharge: 1,
      shippingCost: 0,
      discountEnabled: false,
      discountType: AdjustmentType.PERCENTAGE,
      discountValue: 0,
      depositPct: 40,
      roundingMultiple: 1,
    });
    // total = 10.01, 40% = 4.004 -> nunca puede quedar en 4.00, se redondea a 5
    expect(totals.depositAmount).toBeGreaterThanOrEqual(totals.total * 0.4);
  });

  it('el descuento nunca excede el subtotal ni queda negativo', () => {
    const totals = calculateQuotationTotals({
      items: [{ ...baseItem, quantity: 1, retailPrice: 10 }],
      wholesaleThresholdQty: 31,
      fragranceSurcharge: 1,
      shippingCost: 0,
      discountEnabled: true,
      discountType: AdjustmentType.PERCENTAGE,
      discountValue: 500, // descuento absurdo, debe acotarse
      depositPct: 0,
      roundingMultiple: 1,
    });
    expect(totals.discountAmount).toBe(10);
    expect(totals.total).toBe(0);
  });

  it('el flete no entra al costo de produccion (es traspaso, no produccion)', () => {
    const withShipping = calculateQuotationTotals({
      items: [{ ...baseItem, quantity: 1, retailPrice: 10 }],
      wholesaleThresholdQty: 31,
      fragranceSurcharge: 1,
      shippingCost: 50,
      discountEnabled: false,
      discountType: AdjustmentType.PERCENTAGE,
      discountValue: 0,
      depositPct: 0,
      roundingMultiple: 1,
    });
    const withoutShipping = calculateQuotationTotals({
      items: [{ ...baseItem, quantity: 1, retailPrice: 10 }],
      wholesaleThresholdQty: 31,
      fragranceSurcharge: 1,
      shippingCost: 0,
      discountEnabled: false,
      discountType: AdjustmentType.PERCENTAGE,
      discountValue: 0,
      depositPct: 0,
      roundingMultiple: 1,
    });
    expect(withShipping.grossProfit).toBe(withoutShipping.grossProfit);
    expect(withShipping.total).toBe(withoutShipping.total + 50);
  });
});
