import type { ProductCostingResult } from '../../../catalog/products/services/product-costing-calculator.service';
import { QuotationLineCostingService } from './quotation-line-costing.service';

const base: ProductCostingResult = {
  waxGramsPerUnit: 100,
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
  { name: 'con aroma elegido', withFragrance: true, fragranceSupplyId: 7, total: 20.123456, fragrance: 1 },
  { name: 'sin aroma', withFragrance: false, fragranceSupplyId: null, total: 19.123456, fragrance: 0 },
  { name: 'con aroma pendiente', withFragrance: true, fragranceSupplyId: null, total: 20.123456, fragrance: 1 },
])('$name aplica solo el recargo fijo al costo', ({ withFragrance, fragranceSupplyId, total, fragrance }) => {
  const calculator = { compute: jest.fn().mockReturnValue(base) };
  const service = new QuotationLineCostingService(calculator as never);
  const product = { id: 1, kind: 'SIMPLE', components: [], supplies: [], excludedSupplyIds: [] };
  const input = { quantity: 10, setupMinutesOverride: 0, withFragrance, fragranceSupplyId };
  const context = {
    settings: {} as never,
    laborRatePerMinute: 1,
    overheadRatePerMinute: 1,
    defaultWaxUnitCost: 0.1,
    fragranceSurcharge: 1,
  };

  const result = service.costLine(product as never, input, context);

  expect(result).toEqual({ ...base, unitTotalCost: total, unitFragranceCost: fragrance });
  expect(calculator.compute).toHaveBeenCalledWith(
    expect.anything(), context.settings, 1, 1, 0.1,
    { prorationQuantity: 10, setupMinutesTotal: 0, fragrance: null },
  );
  expect(base.unitTotalCost).toBe(19.123456);
  expect(base.unitFragranceCost).toBe(0);
});
