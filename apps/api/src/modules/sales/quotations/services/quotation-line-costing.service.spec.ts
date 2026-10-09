import type { ProductCostingResult } from '../../../catalog/products/services/product-costing-calculator.service';
import { QuotationLineCostingService } from './quotation-line-costing.service';

const base: ProductCostingResult = {
  waxGramsPerUnit: 100,
  fragranceBaseGrams: 100,
  piecesPerMeltBatch: 10,
  meltMinutesPerUnit: 1,
  setupMinutesPerUnit: 2,
  packMinutesPerUnit: 3,
  laborMinutesPerUnit: 6,
  unitWaxCost: 10,
  unitSupplyCost: 2,
  unitFragranceCost: 0,
  unitLaborCost: 6,
  unitOverheadCost: 1.123456,
  unitTotalCost: 19.123456,
  resolvedSupplies: [{ supplyId: 1, quantity: 2, unitCost: 1 }],
};

it.each([
  { name: 'modo fijo con aroma elegido', real: false, withFragrance: true, cost: 2.3, slug: 'MILLILITER', grams: 100, waxGrams: 100, total: 20.123456, fragrance: 1, ml: 1 },
  { name: 'modo fijo sin aroma', real: false, withFragrance: false, cost: null, slug: null, grams: 100, waxGrams: 100, total: 19.123456, fragrance: 0, ml: 0 },
  { name: 'modo fijo con aroma pendiente', real: false, withFragrance: true, cost: null, slug: null, grams: 100, waxGrams: 100, total: 20.123456, fragrance: 1, ml: 1 },
  { name: 'modo real con aroma en ml', real: true, withFragrance: true, cost: 2.3, slug: 'MILLILITER', grams: 100, waxGrams: 100, total: 21.423456, fragrance: 2.3, ml: 1 },
  { name: 'modo real con aroma pendiente', real: true, withFragrance: true, cost: null, slug: null, grams: 100, waxGrams: 100, total: 20.123456, fragrance: 1, ml: 1 },
  { name: 'modo real con slug MILILITRO (base creada a mano)', real: true, withFragrance: true, cost: 2.3, slug: 'MILILITRO', grams: 100, waxGrams: 100, total: 21.423456, fragrance: 2.3, ml: 1 },
  { name: 'modo real con otra unidad', real: true, withFragrance: true, cost: 2.3, slug: 'GRAM', grams: 100, waxGrams: 100, total: 20.123456, fragrance: 1, ml: 1 },
  { name: 'ramo con base de aroma y sin gramos propios', real: true, withFragrance: true, cost: 2.3, slug: 'MILLILITER', grams: 300, waxGrams: 0, total: 26.023456, fragrance: 6.9, ml: 3 },
  { name: 'modo real sin aroma', real: true, withFragrance: false, cost: 2.3, slug: 'MILLILITER', grams: 100, waxGrams: 100, total: 19.123456, fragrance: 0, ml: 0 },
])('$name', ({ real, withFragrance, cost, slug, grams, waxGrams, total, fragrance, ml }) => {
  const costing = { ...base, fragranceBaseGrams: grams, waxGramsPerUnit: waxGrams };
  const calculator = { compute: jest.fn().mockReturnValue(costing) };
  const service = new QuotationLineCostingService(calculator as never);
  const product = { id: 1, kind: waxGrams === 0 ? 'BOUQUET' : 'SIMPLE', components: [], supplies: [], excludedSupplyIds: [] };
  const input = { quantity: 10, setupMinutesOverride: 0, withFragrance, fragranceUnitCost: cost, fragranceUnit: slug ? { slug, abbr: slug === 'GRAM' ? 'g' : 'ml' } : null };
  const context = {
    settings: {} as never,
    laborRatePerMinute: 1,
    overheadRatePerMinute: 1,
    defaultWaxUnitCost: 0.1,
    fragranceSurcharge: 1,
    fragranceDropsPer100g: 20,
    fragranceRealCost: real,
  };

  const result = service.costLine(product as never, input, context);

  expect(result).toEqual({ ...costing, unitTotalCost: total, unitFragranceCost: fragrance, fragranceMlPerUnit: ml });
  expect(calculator.compute).toHaveBeenCalledWith(
    expect.anything(), context.settings, 1, 1, 0.1,
    { prorationQuantity: 10, setupMinutesTotal: 0 },
  );
  expect(costing.unitTotalCost).toBe(19.123456);
  expect(costing.unitFragranceCost).toBe(0);
});
