import { describe, expect, it } from 'vitest';
import {
  PriceTier,
  markupFromMargin,
  marginFromMarkup,
  resolvePriceTier,
  suggestPrices,
  validateMinMargin,
} from './pricing';

describe('correccion #10: el bracket se resuelve UNA vez, sobre la cantidad acumulada del pedido', () => {
  it('31 + 9 = 40 piezas de dos modelos distintos resuelve a mayoreo, no a menudeo', () => {
    // Este es el "Pedido 2" de enero (Joseline): 31 pz de un modelo + 9 de
    // otro. En el Excel se cobro a menudeo porque nadie sumaba las dos
    // partidas. Aqui el umbral se evalua sobre el total del pedido.
    expect(resolvePriceTier(31 + 9, 31)).toBe(PriceTier.WHOLESALE);
  });

  it('menos del umbral resuelve a menudeo', () => {
    expect(resolvePriceTier(20, 31)).toBe(PriceTier.RETAIL);
  });

  it('exactamente el umbral ya es mayoreo (sin el traslape "1-30"/"30-50" del Excel)', () => {
    expect(resolvePriceTier(31, 31)).toBe(PriceTier.WHOLESALE);
    expect(resolvePriceTier(30, 31)).toBe(PriceTier.RETAIL);
  });
});

describe('correccion #8: "50% de utilidad" es markup 50% = margen 33.3%', () => {
  it('marginFromMarkup(50) = 33.33, no 50', () => {
    expect(marginFromMarkup(50)).toBeCloseTo(33.33, 1);
  });

  it('markupFromMargin es la inversa de marginFromMarkup', () => {
    const margin = marginFromMarkup(50);
    expect(markupFromMargin(margin)).toBeCloseTo(50, 1);
  });
});

describe('suggestPrices: sin el "+1" oculto del Excel, siempre redondeado hacia arriba', () => {
  it('Osito Chico Liston: costo 7.63, markup 50%/40%', () => {
    const prices = suggestPrices(7.63, {
      retailMarkupPct: 50,
      wholesaleMarkupPct: 40,
      roundingMultiple: 1,
    });

    // rawPrice = 7.63 * 1.5 = 11.445 -> redondeado hacia arriba = 12 (sin "+1")
    expect(prices.retail.rawPrice).toBeCloseTo(11.45, 2);
    expect(prices.retail.suggestedPrice).toBe(12);
    // rawPrice = 7.63 * 1.4 = 10.682 -> redondeado hacia arriba = 11
    expect(prices.wholesale.rawPrice).toBeCloseTo(10.68, 2);
    expect(prices.wholesale.suggestedPrice).toBe(11);
    // El margen mostrado es sobre el precio YA redondeado, nunca sobre el crudo.
    expect(prices.retail.marginPct).toBeCloseTo(((12 - 7.63) / 12) * 100, 1);
  });

  it('el redondeo nunca baja el precio por debajo del costo con markup', () => {
    const prices = suggestPrices(9.267, {
      retailMarkupPct: 50,
      wholesaleMarkupPct: 40,
      roundingMultiple: 1,
    });
    expect(prices.retail.suggestedPrice).toBeGreaterThanOrEqual(prices.retail.rawPrice);
    expect(prices.wholesale.suggestedPrice).toBeGreaterThanOrEqual(prices.wholesale.rawPrice);
  });
});

describe('correccion #9: validateMinMargin bloquea overrides que rompen el piso', () => {
  it('rechaza un precio de mayoreo que deja menos margen del piso configurado', () => {
    // Osito Chico SOLO: costo 6.44, precio de mayoreo capturado a mano en el
    // Excel = 7.00 -> margen real 8.4%, muy por debajo de un piso del 25%.
    const check = validateMinMargin(7.0, 6.44, 25);
    expect(check.ok).toBe(false);
    expect(check.marginPct).toBeCloseTo(8.0, 0);
    expect(check.minPrice).toBeGreaterThan(7.0);
  });

  it('acepta un precio que si respeta el piso', () => {
    const check = validateMinMargin(12, 7.63, 25);
    expect(check.ok).toBe(true);
  });
});
