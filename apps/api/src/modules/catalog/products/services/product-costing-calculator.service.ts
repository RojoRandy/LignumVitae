// Logica de costeo compartida entre RecalculateProductCostingUseCase (que
// persiste el costeo de un producto ya guardado) y PreviewProductCostingUseCase
// (que calcula el costo de una combinacion todavia sin guardar, para el
// panel "en vivo" del asistente de alta). Las dos interfaces de entrada son
// estructurales a proposito: aceptan tanto las relaciones reales de Prisma
// como un objeto armado a mano para la vista previa.
import { Injectable } from '@nestjs/common';
import { calculateBouquetCost, calculateProductCost, type ProductCostBreakdown, type SupplyConsumption } from '@lignumvitae/types';
import { Prisma, ProductKind } from '@prisma/client';
import { CatalogErrors } from '../../../../common/errors/catalog.errors';
import { SettingsService } from '../../../settings/settings.service';

interface CostableSupplyLine {
  supplyId: number;
  quantity: Prisma.Decimal;
  supply: { currentUnitCost: Prisma.Decimal };
}

export interface CostableCandle {
  grams: Prisma.Decimal;
  wastePct: Prisma.Decimal;
  meltMinutes: number;
  meltBatchGrams: number | null;
  waxSupply: { currentUnitCost: Prisma.Decimal } | null;
  supplyTemplate: CostableSupplyLine[];
}

export interface CostablePackagingType {
  packMinutes: number;
  setupMinutes: number;
  supplyTemplate: CostableSupplyLine[];
}

export interface CostableCardType {
  setupMinutes: number;
  supplyTemplate: CostableSupplyLine[];
}

export interface CostableManualSupply {
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
}

export interface CostableComponent {
  candle: CostableCandle;
  quantity: number;
}

export interface ProductCostingContext {
  productId?: number; // solo para el mensaje de error; ausente en preview
  kind: ProductKind;
  candle?: CostableCandle | null;
  packagingType?: CostablePackagingType | null;
  cardType?: CostableCardType | null;
  components?: CostableComponent[];
  manualSupplies: CostableManualSupply[];
  extraSetupMinutes: number;
  extraPackMinutes: number;
  assemblyMinutes: number;
}

type SettingsEntity = Awaited<ReturnType<SettingsService['get']>>;

/** compute() con el BOM ya resuelto a plano, para que quien llama (p. ej. una
 *  cotizacion) pueda congelar exactamente los mismos renglones que se
 *  costearon, sin volver a resolver plantillas por su cuenta. */
export interface ProductCostingResult extends ProductCostBreakdown {
  resolvedSupplies: SupplyConsumption[];
}

/** Lo que un producto de CATALOGO no puede saber por adelantado porque
 *  depende del renglon concreto de una cotizacion: cuantas piezas son de
 *  verdad (no el umbral de mayoreo generico), si el diseno ya esta pagado
 *  (setupMinutesTotal: 0), y si esta pieza en particular lleva aroma. Los
 *  dos call sites de catalogo (recalculo y vista previa de producto) nunca
 *  pasan esto, asi que su comportamiento no cambia en absoluto. */
export interface ProductCostingOverrides {
  prorationQuantity?: number;
  setupMinutesTotal?: number;
  fragrance?: { unitCost: number; loadPct: number } | null;
}

@Injectable()
export class ProductCostingCalculator {
  compute(
    context: ProductCostingContext,
    settings: SettingsEntity,
    laborRatePerMinute: number,
    overheadRatePerMinute: number,
    defaultWaxUnitCost: number,
    overrides?: ProductCostingOverrides,
  ): ProductCostingResult {
    return context.kind === 'BOUQUET'
      ? this.costBouquet(context, settings, laborRatePerMinute, overheadRatePerMinute, defaultWaxUnitCost, overrides)
      : this.costSimple(context, settings, laborRatePerMinute, overheadRatePerMinute, defaultWaxUnitCost, overrides);
  }

  private costSimple(
    context: ProductCostingContext,
    settings: SettingsEntity,
    laborRatePerMinute: number,
    overheadRatePerMinute: number,
    defaultWaxUnitCost: number,
    overrides?: ProductCostingOverrides,
  ): ProductCostingResult {
    if (!context.candle) throw CatalogErrors.Exceptions.SIMPLE_PRODUCT_REQUIRES_CANDLE({ productId: context.productId });

    const waxUnitCost = context.candle.waxSupply?.currentUnitCost.toNumber() ?? defaultWaxUnitCost;

    const templateSupplies = [
      ...context.candle.supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitCost: t.supply.currentUnitCost.toNumber() })),
      ...(context.packagingType?.supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitCost: t.supply.currentUnitCost.toNumber() })) ?? []),
      ...(context.cardType?.supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitCost: t.supply.currentUnitCost.toNumber() })) ?? []),
    ];
    const manualSupplies = context.manualSupplies.map((s) => ({ supplyId: 0, quantity: s.quantity.toNumber(), unitCost: s.unitCost.toNumber() }));
    const resolvedSupplies = [...templateSupplies, ...manualSupplies];

    const setupMinutes = (context.packagingType?.setupMinutes ?? 0) + (context.cardType?.setupMinutes ?? 0) + context.extraSetupMinutes;
    const packMinutes = (context.packagingType?.packMinutes ?? 0) + context.extraPackMinutes;

    const breakdown = calculateProductCost({
      grams: context.candle.grams.toNumber(),
      wastePct: context.candle.wastePct.toNumber(),
      waxUnitCost,
      supplies: resolvedSupplies,
      meltMinutes: context.candle.meltMinutes,
      meltBatchGrams: context.candle.meltBatchGrams ?? settings.meltBatchGrams,
      setupMinutes: overrides?.setupMinutesTotal ?? setupMinutes,
      packMinutes,
      // Costeo de catalogo (sin una cotizacion concreta todavia): se usa el
      // umbral de mayoreo como cantidad de referencia y el precio se marca
      // como "a partir de N piezas" en la UI. Una cotizacion pasa la
      // cantidad REAL del renglon en overrides.prorationQuantity.
      prorationQuantity: overrides?.prorationQuantity ?? settings.wholesaleThresholdQty,
      laborRatePerMinute,
      overheadRatePerMinute,
      // El aroma se elige y se cobra por renglon en la cotizacion, nunca a
      // nivel de catalogo -- por eso los dos call sites de catalogo jamas
      // pasan overrides.fragrance y esto sigue siendo null para ellos.
      fragrance: overrides?.fragrance ?? null,
    });

    return { ...breakdown, resolvedSupplies };
  }

  private costBouquet(
    context: ProductCostingContext,
    settings: SettingsEntity,
    laborRatePerMinute: number,
    overheadRatePerMinute: number,
    defaultWaxUnitCost: number,
    overrides?: ProductCostingOverrides,
  ): ProductCostingResult {
    if (!context.components || context.components.length === 0) {
      throw CatalogErrors.Exceptions.BOUQUET_REQUIRES_COMPONENTS({ productId: context.productId });
    }

    const components = context.components.map((component) => {
      const candleCost = calculateProductCost({
        grams: component.candle.grams.toNumber(),
        wastePct: component.candle.wastePct.toNumber(),
        waxUnitCost: component.candle.waxSupply?.currentUnitCost.toNumber() ?? defaultWaxUnitCost,
        supplies: [], // el BOM de la vela sola (mecha, colorante) se agrega aparte via su template
        meltMinutes: component.candle.meltMinutes,
        meltBatchGrams: component.candle.meltBatchGrams ?? settings.meltBatchGrams,
        setupMinutes: 0,
        packMinutes: 0,
        prorationQuantity: 1,
        laborRatePerMinute,
        overheadRatePerMinute: 0, // los indirectos del ramo se cargan una sola vez, a nivel de ramo
        fragrance: null,
      });
      return { unitCost: candleCost, quantity: component.quantity };
    });

    const manualSupplies = context.manualSupplies.map((s) => ({ supplyId: 0, quantity: s.quantity.toNumber(), unitCost: s.unitCost.toNumber() }));

    // Bug arreglado: antes solo entraba extraSetupMinutes, asi que el empaque
    // y la tarjeta del ramo (Field Empaque y tarjeta del asistente) no
    // aportaban NADA al costo del ramo, a diferencia de una vela SIMPLE
    // donde si se suman (ver costSimple arriba).
    const setupMinutes = (context.packagingType?.setupMinutes ?? 0) + (context.cardType?.setupMinutes ?? 0) + context.extraSetupMinutes;

    // Un ramo no tiene "gramos de la pieza": el aroma se calcula sobre la
    // cera total de todas sus velas componentes (con merma ya incluida en
    // meltMinutesPerUnit... no, en waxGramsPerUnit de cada componente).
    const totalGrams = context.components.reduce((acc, c) => acc + c.candle.grams.toNumber() * (1 + c.candle.wastePct.toNumber()) * c.quantity, 0);

    const breakdown = calculateBouquetCost({
      components,
      supplies: manualSupplies,
      assemblyMinutes: context.assemblyMinutes,
      setupMinutes: overrides?.setupMinutesTotal ?? setupMinutes,
      prorationQuantity: overrides?.prorationQuantity ?? settings.wholesaleThresholdQty,
      laborRatePerMinute,
      overheadRatePerMinute,
      fragrance: overrides?.fragrance ? { ...overrides.fragrance, totalGrams } : null,
    });

    return { ...breakdown, resolvedSupplies: manualSupplies };
  }
}
