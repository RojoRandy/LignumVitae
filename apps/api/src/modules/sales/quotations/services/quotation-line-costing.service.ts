// Costea UN renglon de cotizacion contra un producto de catalogo ya
// existente. A diferencia del costeo de catalogo (que usa el umbral de
// mayoreo como cantidad de referencia porque no hay pedido real todavia),
// aqui se conoce la cantidad EXACTA del renglon, si el diseno ya esta
// pagado (personalizacion reutilizada) mediante `overrides`. El costo del
// aroma se agrega aqui segun la configuracion y el insumo elegido.
import { Injectable } from '@nestjs/common';
import { estimateFragranceMl, money, round6 } from '@lignumvitae/types';
import type { Settings } from '@prisma/client';
import { ProductCostingCalculator, type ProductCostingContext, type ProductCostingResult } from '../../../catalog/products/services/product-costing-calculator.service';
import type { ProductWithRelations } from '../../../catalog/products/product.repository';

// El slug de una unidad es dato editable (el seed usa MILLILITER, una base creada a mano
// puede traer MILILITRO), asi que se acepta tambien por abreviatura 'ml'.
const isMilliliter = (unit: { slug: string; abbr: string }) =>
  unit.abbr.trim().toLowerCase() === 'ml' || ['MILLILITER', 'MILILITRO'].includes(unit.slug.trim().toUpperCase());

export interface QuotationLineCostingContext {
  settings: Settings;
  laborRatePerMinute: number;
  overheadRatePerMinute: number;
  defaultWaxUnitCost: number;
  fragranceSurcharge: number;
  fragranceDropsPer100g: number;
  fragranceRealCost: boolean;
}

export interface QuotationLineCostingInput {
  quantity: number;
  setupMinutesOverride?: number | null;
  withFragrance: boolean;
  fragranceUnitCost: number | null;
  fragranceUnit: { slug: string; abbr: string } | null;
}

@Injectable()
export class QuotationLineCostingService {
  constructor(private readonly calculator: ProductCostingCalculator) {}

  costLine(product: ProductWithRelations, input: QuotationLineCostingInput, ctx: QuotationLineCostingContext): ProductCostingResult & { fragranceMlPerUnit: number } {
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

    const result = this.calculator.compute(context, ctx.settings, ctx.laborRatePerMinute, ctx.overheadRatePerMinute, ctx.defaultWaxUnitCost, {
      prorationQuantity: input.quantity,
      setupMinutesTotal: input.setupMinutesOverride ?? undefined,
    });

    // Decision de negocio: el cobro al cliente siempre es el recargo fijo;
    // el costo para el margen depende de Settings.fragranceRealCost.
    if (!input.withFragrance) return { ...result, fragranceMlPerUnit: 0 };
    const fragranceMlPerUnit = estimateFragranceMl(result.fragranceBaseGrams, ctx.fragranceDropsPer100g);
    const fragranceCost = ctx.fragranceRealCost && input.fragranceUnitCost !== null && input.fragranceUnit !== null && isMilliliter(input.fragranceUnit)
      ? round6(money(fragranceMlPerUnit).times(input.fragranceUnitCost)).toNumber()
      : ctx.fragranceSurcharge;
    return {
      ...result,
      fragranceMlPerUnit,
      unitFragranceCost: round6(money(result.unitFragranceCost).plus(fragranceCost)).toNumber(),
      unitTotalCost: round6(money(result.unitTotalCost).plus(fragranceCost)).toNumber(),
    };
  }
}
