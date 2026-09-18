// Costea UN renglon de cotizacion contra un producto de catalogo ya
// existente. A diferencia del costeo de catalogo (que usa el umbral de
// mayoreo como cantidad de referencia porque no hay pedido real todavia),
// aqui se conoce la cantidad EXACTA del renglon, si el diseno ya esta
// pagado (personalizacion reutilizada) y si esta pieza en particular lleva
// aroma -- por eso ProductCostingCalculator.compute() recibe `overrides`.
import { Injectable } from '@nestjs/common';
import type { Settings } from '@prisma/client';
import { ProductCostingCalculator, type ProductCostingContext, type ProductCostingResult } from '../../../catalog/products/services/product-costing-calculator.service';
import type { ProductWithRelations } from '../../../catalog/products/product.repository';

export interface QuotationLineCostingContext {
  settings: Settings;
  laborRatePerMinute: number;
  overheadRatePerMinute: number;
  defaultWaxUnitCost: number;
  fragranceLoadPct: number;
}

export interface QuotationLineCostingInput {
  quantity: number;
  setupMinutesOverride?: number | null;
  withFragrance: boolean;
  fragranceUnitCost: number | null;
}

@Injectable()
export class QuotationLineCostingService {
  constructor(private readonly calculator: ProductCostingCalculator) {}

  costLine(product: ProductWithRelations, input: QuotationLineCostingInput, ctx: QuotationLineCostingContext): ProductCostingResult {
    const context: ProductCostingContext = {
      excludedSupplyIds: product.excludedSupplyIds,
      productId: product.id,
      kind: product.kind,
      candle: product.candle,
      packagingType: product.packagingType,
      cardType: product.cardType,
      components: product.components.map((c) => ({ candle: c.candle, quantity: c.quantity })),
      manualSupplies: product.supplies.filter((s) => s.source === 'MANUAL').map((s) => ({ quantity: s.quantity, unitCost: s.supply.currentUnitCost })),
      extraSetupMinutes: product.extraSetupMinutes,
      extraPackMinutes: product.extraPackMinutes,
      assemblyMinutes: product.assemblyMinutes,
    };

    return this.calculator.compute(context, ctx.settings, ctx.laborRatePerMinute, ctx.overheadRatePerMinute, ctx.defaultWaxUnitCost, {
      prorationQuantity: input.quantity,
      setupMinutesTotal: input.setupMinutesOverride ?? undefined,
      fragrance: input.withFragrance && input.fragranceUnitCost !== null
        ? { unitCost: input.fragranceUnitCost, loadPct: ctx.fragranceLoadPct }
        : null,
    });
  }
}
