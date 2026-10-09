import { Prisma } from '@prisma/client';
import { ProductCostingCalculator, type ProductCostingContext } from './product-costing-calculator.service';

const dec = (n: number) => new Prisma.Decimal(n);

// Vela sin cera, sin insumos ni merma, con tarjeta de 60 min de preparacion POR PEDIDO.
// Tarifas 0.5 + 0.5 $/min => el diseno vale $60 por pedido; lo demas es fijo.
const context = (setupMinutes: number): ProductCostingContext => ({
  kind: 'SIMPLE',
  candle: {
    grams: dec(100),
    wastePct: dec(0),
    meltMinutes: 0,
    meltBatchGrams: 1000,
    waxSupply: { currentUnitCost: dec(0) },
    supplyTemplate: [],
  },
  packagingType: null,
  cardType: { setupMinutes, supplyTemplate: [] },
  manualSupplies: [],
  extraSetupMinutes: 0,
  extraPackMinutes: 0,
  assemblyMinutes: 0,
});

const settings = (designReferenceQty: number, wholesaleThresholdQty = 31) =>
  ({ designReferenceQty, wholesaleThresholdQty, meltBatchGrams: 1000 }) as never;

const compute = (designReferenceQty: number, overrides?: { prorationQuantity: number }) =>
  new ProductCostingCalculator().compute(context(60), settings(designReferenceQty), 0.5, 0.5, 0, overrides);

describe('referencia para repartir el diseno', () => {
  it('menudeo: reparte el diseno entre designReferenceQty (60 min x $1 = $60 entre 20 = $3.00)', () => {
    expect(compute(20).unitLaborCost + compute(20).unitOverheadCost).toBeCloseTo(3, 6);
  });

  it('con designReferenceQty = umbral de mayoreo (31) el costo es el historico', () => {
    const referencia31 = compute(31).unitTotalCost;
    const umbral31 = compute(20, { prorationQuantity: 31 }).unitTotalCost;
    expect(referencia31).toBeCloseTo(umbral31, 6);
    expect(referencia31).toBeCloseTo(60 / 31, 5);
  });

  it('mayoreo: el override por cantidad reparte entre el umbral aunque la referencia sea otra', () => {
    expect(compute(20, { prorationQuantity: 31 }).unitTotalCost).toBeCloseTo(60 / 31, 5);
    expect(compute(20).unitTotalCost).toBeCloseTo(3, 6);
    expect(compute(20).unitTotalCost).toBeGreaterThan(compute(20, { prorationQuantity: 31 }).unitTotalCost);
  });
});
