// Recalcula el costeo cacheado de un producto (o de un ramo) y su precio
// sugerido. Se dispara al crear/editar el producto, al cambiar el costo de
// un insumo que usa, al editar una plantilla de empaque/tarjeta/vela, o al
// cerrar el mes (cambia la tasa de gastos indirectos). Es el UNICO lugar
// que escribe los campos unitXxxCost / xxxListPrice de Product — nunca se
// escriben a mano desde un controller.
import { Injectable } from '@nestjs/common';
import { suggestPrices } from '@lignumvitae/types';
import { Prisma } from '@prisma/client';
import { ProductRepository, ProductWithRelations } from '../product.repository';
import { CatalogErrors } from '../../../../common/errors/catalog.errors';
import { SettingsService } from '../../../settings/settings.service';
import { OverheadRepository } from '../../../inventory/overhead/overhead.repository';
import { SupplyRepository } from '../../../inventory/supplies/supply.repository';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import { ProductCostingCalculator, type ProductCostingContext } from '../services/product-costing-calculator.service';

@Injectable()
export class RecalculateProductCostingUseCase implements UseCase<number, ProductWithRelations> {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly settingsService: SettingsService,
    private readonly overheadRepository: OverheadRepository,
    private readonly supplyRepository: SupplyRepository,
    private readonly calculator: ProductCostingCalculator,
  ) {}

  async execute(productId: number): Promise<ProductWithRelations> {
    const product = await this.productRepository.findById(productId);
    if (!product) throw CatalogErrors.Exceptions.PRODUCT_NOT_FOUND({ id: productId });

    const settings = await this.settingsService.get();
    const closedPeriod = await this.overheadRepository.findMostRecentClosed();

    const laborRatePerMinute = settings.dailyWage.dividedBy(settings.workHoursPerDay).dividedBy(60).toNumber();
    // Bug arreglado: antes esto ignoraba overheadRateMode por completo, asi
    // que elegir "Fijo" en Configuracion no hacia nada -- en cuanto habia un
    // mes cerrado, su tasa se usaba de todos modos. FIXED ahora sí fuerza la
    // tasa de respaldo aunque exista un cierre reciente.
    const overheadRatePerMinute =
      settings.overheadRateMode === 'FIXED' || !closedPeriod
        ? settings.overheadRatePerMinute.toNumber()
        : closedPeriod.ratePerMinute.toNumber();

    // Cera por defecto del negocio (Settings.waxSupplyId), para las velas que
    // no tienen asignada su propia cera. Si tampoco hay default configurado,
    // el costo de cera queda en 0 — preferible a inventar un numero.
    const defaultWaxUnitCost = settings.waxSupplyId
      ? (await this.supplyRepository.findById(settings.waxSupplyId))?.currentUnitCost.toNumber() ?? 0
      : 0;

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

    const breakdown = this.calculator.compute(context, settings, laborRatePerMinute, overheadRatePerMinute, defaultWaxUnitCost);
    const { resolvedSupplies: _resolvedSupplies, ...breakdownForBasis } = breakdown;

    const prices = suggestPrices(breakdown.unitTotalCost, {
      retailMarkupPct: settings.retailMarkupPct.toNumber(),
      wholesaleMarkupPct: settings.wholesaleMarkupPct.toNumber(),
      roundingMultiple: settings.roundingMultiple.toNumber(),
    });

    await this.productRepository.updateCosting(productId, {
      unitWaxCost: breakdown.unitWaxCost,
      unitSupplyCost: breakdown.unitSupplyCost,
      unitLaborCost: breakdown.unitLaborCost,
      unitOverheadCost: breakdown.unitOverheadCost,
      unitTotalCost: breakdown.unitTotalCost,
      retailListPrice: prices.retail.suggestedPrice,
      wholesaleListPrice: prices.wholesale.suggestedPrice,
      costingBasis: {
        laborRatePerMinute,
        overheadRatePerMinute,
        // Bug arreglado: cuando overheadRateMode es FIXED, closedPeriod puede
        // seguir existiendo (el mes se cerro, solo que se ignora), y antes
        // igual se guardaba su rateSource aqui -- quedaba escrito "Derivada"
        // en el costeo aunque la tasa realmente usada fuera el respaldo.
        overheadRateSource: settings.overheadRateMode === 'FIXED' || !closedPeriod ? 'FALLBACK' : closedPeriod.rateSource,
        waxUnitCost: product.candle?.waxSupply?.currentUnitCost.toNumber() ?? defaultWaxUnitCost,
        // Bug arreglado: antes siempre guardaba settings.meltBatchGrams,
        // aunque la vela tuviera su propia "Capacidad de la olla" (override)
        // y el calculo de arriba SI la haya usado -- costingBasis mentia.
        meltBatchGrams: product.candle?.meltBatchGrams ?? settings.meltBatchGrams,
        prorationQuantity: settings.wholesaleThresholdQty,
        retailMarkupPct: settings.retailMarkupPct.toNumber(),
        wholesaleMarkupPct: settings.wholesaleMarkupPct.toNumber(),
        roundingMultiple: settings.roundingMultiple.toNumber(),
        // resolvedSupplies queda fuera: es plano BOM-por-linea para congelar
        // en una cotizacion, no algo que costingBasis necesite mostrar.
        breakdown: { ...breakdownForBasis },
      } satisfies Prisma.InputJsonObject,
      costingComputedAt: new Date(),
    });

    return this.productRepository.findById(productId) as Promise<ProductWithRelations>;
  }
}
