// Cierra el mes: genera la depreciacion de los activos vigentes, suma la
// bolsa de gastos indirectos (incluida esa depreciacion), cuenta los
// minutos productivos de los pedidos ENTREGADOS en el mes, y fija la tasa
// $/minuto que sustituye la constante $2.50 del Excel. Un mes cerrado no se
// vuelve a tocar por accidente: closedAt marca el candado.
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { deriveOverheadRate } from '@lignumvitae/types';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import { InventoryErrors } from '../../../../common/errors/inventory.errors';
import { OverheadRepository } from '../overhead.repository';
import { SettingsService } from '../../../settings/settings.service';
import { RecalculateAllProductsUseCase } from '../../../catalog/products/usecases/recalculate-all-products.usecase';

export interface ClosePeriodArgs {
  year: number;
  month: number; // 1-12
  /** Si true, recalcula un mes ya cerrado (correccion excepcional). */
  force?: boolean;
}

@Injectable()
export class CloseOverheadPeriodUseCase implements UseCase<ClosePeriodArgs, unknown> {
  constructor(
    private readonly overheadRepository: OverheadRepository,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => RecalculateAllProductsUseCase))
    private readonly recalculateAllProductsUseCase: RecalculateAllProductsUseCase,
  ) {}

  async execute(args: ClosePeriodArgs) {
    const existing = await this.overheadRepository.findByPeriod(args.year, args.month);
    if (existing?.closedAt && !args.force) {
      throw InventoryErrors.Exceptions.OVERHEAD_PERIOD_ALREADY_CLOSED({ year: args.year, month: args.month });
    }

    const periodStart = new Date(Date.UTC(args.year, args.month - 1, 1));
    const periodEnd = new Date(Date.UTC(args.year, args.month, 0, 23, 59, 59));

    await this.generateDepreciation(periodStart, periodEnd);

    const expenseTotal = await this.overheadRepository.sumOverheadExpenses(periodStart);
    const produced = await this.overheadRepository.sumProducedLabor(periodStart, periodEnd);
    const settings = await this.settingsService.get();

    const result = deriveOverheadRate({
      expenseTotal,
      producedLaborMinutes: produced.minutes,
      fallbackRatePerMinute: settings.overheadRatePerMinute.toNumber(),
      minSampleMinutes: settings.overheadMinSampleMinutes,
      maxDeviationPct: settings.overheadMaxDeviationPct.toNumber(),
    });

    const ratePerUnit = produced.units > 0 ? (result.ratePerMinute * produced.minutes) / produced.units : result.ratePerMinute;

    const period = await this.overheadRepository.upsert(args.year, args.month, {
      expenseTotal,
      producedMinutes: produced.minutes,
      producedUnits: produced.units,
      producedGrams: produced.grams,
      ratePerMinute: result.ratePerMinute,
      rateSource: result.source,
      ratePerUnit,
      closedAt: new Date(),
    });

    // Bug arreglado (D.1 del plan de UX): cerrar el mes cambia la tasa de
    // gastos indirectos de TODO el catalogo (ver RecalculateProductCostingUseCase,
    // que usa findMostRecentClosed()), pero antes ningun producto se
    // recosteaba hasta que alguien lo tocara por otra razon.
    await this.recalculateAllProductsUseCase.execute();

    return period;
  }

  /**
   * Amortizacion en linea recta: cada activo vigente aporta
   * totalCost / usefulLifeMonths a la bolsa de indirectos de ESTE mes. Es lo
   * que evita que un molde de $2,948 caiga completo en el mes en que se
   * compro (39.4% de los "egresos" de enero en el Excel eran moldes).
   */
  private async generateDepreciation(periodStart: Date, periodEnd: Date) {
    await this.overheadRepository.deactivateExistingDepreciation(periodStart);

    const assets = await this.overheadRepository.findAssetsForDepreciation(periodStart, periodEnd);
    if (assets.length === 0) return;

    const category = await this.overheadRepository.findOrCreateDepreciationCategory();

    for (const asset of assets) {
      const monthlyAmount = asset.totalCost
        .minus(asset.salvageValue)
        .dividedBy(asset.usefulLifeMonths)
        .toDecimalPlaces(2)
        .toNumber();
      if (monthlyAmount <= 0) continue;
      await this.overheadRepository.createDepreciationExpense(category.id, monthlyAmount, periodStart, asset.id);
    }
  }
}
