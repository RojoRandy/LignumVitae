// Costea una combinacion de vela+empaque+tarjeta (o los componentes de un
// ramo) SIN guardar nada, para el panel "en vivo" del asistente de alta de
// producto. Comparte toda la formula con RecalculateProductCostingUseCase
// via ProductCostingCalculator; la unica diferencia es de donde vienen los
// datos (aqui de un DTO + lecturas sueltas, alla de un Product ya guardado).
import { Injectable } from '@nestjs/common';
import { suggestPrices, type ProductCostBreakdown, type SuggestedPrices } from '@lignumvitae/types';
import { Prisma } from '@prisma/client';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import { SettingsService } from '../../../settings/settings.service';
import { OverheadRepository } from '../../../inventory/overhead/overhead.repository';
import { SupplyRepository } from '../../../inventory/supplies/supply.repository';
import { CandleRepository } from '../../candles/candle.repository';
import { PackagingTypeRepository } from '../../packaging-types/packaging-type.repository';
import { CardTypeRepository } from '../../card-types/card-type.repository';
import { ProductCostingCalculator, type ProductCostingContext } from '../services/product-costing-calculator.service';
import { PreviewProductCostDto } from '../dto/preview-product-cost.dto';

export interface PreviewProductCostResult {
  breakdown: ProductCostBreakdown;
  prices: SuggestedPrices;
}

@Injectable()
export class PreviewProductCostingUseCase implements UseCase<PreviewProductCostDto, PreviewProductCostResult> {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly overheadRepository: OverheadRepository,
    private readonly supplyRepository: SupplyRepository,
    private readonly candleRepository: CandleRepository,
    private readonly packagingTypeRepository: PackagingTypeRepository,
    private readonly cardTypeRepository: CardTypeRepository,
    private readonly calculator: ProductCostingCalculator,
  ) {}

  async execute(dto: PreviewProductCostDto): Promise<PreviewProductCostResult> {
    const settings = await this.settingsService.get();
    const closedPeriod = await this.overheadRepository.findMostRecentClosed();

    const laborRatePerMinute = settings.dailyWage.dividedBy(settings.workHoursPerDay).dividedBy(60).toNumber();
    // Mismo bug que RecalculateProductCostingUseCase: FIXED debe forzar la
    // tasa de respaldo aunque haya un mes cerrado.
    const overheadRatePerMinute =
      settings.overheadRateMode === 'FIXED' || !closedPeriod
        ? settings.overheadRatePerMinute.toNumber()
        : closedPeriod.ratePerMinute.toNumber();
    const defaultWaxUnitCost = settings.waxSupplyId
      ? (await this.supplyRepository.findById(settings.waxSupplyId))?.currentUnitCost.toNumber() ?? 0
      : 0;

    const [candle, packagingType, cardType] = await Promise.all([
      dto.candleId ? this.candleRepository.findById(dto.candleId) : null,
      dto.packagingTypeId ? this.packagingTypeRepository.findById(dto.packagingTypeId) : null,
      dto.cardTypeId ? this.cardTypeRepository.findById(dto.cardTypeId) : null,
    ]);

    const components = dto.components?.length
      ? await Promise.all(
          dto.components.map(async (c) => ({
            candle: await this.candleRepository.findById(c.candleId),
            quantity: c.quantity,
          })),
        )
      : [];

    const manualSupplyEntries = dto.additionalSupplies?.length
      ? await Promise.all(
          dto.additionalSupplies.map(async (s) => {
            const supply = await this.supplyRepository.findById(s.supplyId);
            return { quantity: new Prisma.Decimal(s.quantity), unitCost: supply?.currentUnitCost };
          }),
        )
      : [];

    const context: ProductCostingContext = {
      excludedSupplyIds: dto.excludedSupplyIds ?? [],
      kind: dto.kind,
      candle,
      packagingType,
      cardType,
      components: components
        .filter((c): c is { candle: NonNullable<typeof c.candle>; quantity: number } => c.candle !== null)
        .map((c) => ({ candle: c.candle, quantity: c.quantity })),
      manualSupplies: manualSupplyEntries.filter((s): s is { quantity: typeof s.quantity; unitCost: NonNullable<typeof s.unitCost> } => s.unitCost !== undefined),
      extraSetupMinutes: dto.extraSetupMinutes ?? 0,
      extraPackMinutes: dto.extraPackMinutes ?? 0,
      assemblyMinutes: dto.assemblyMinutes ?? 0,
    };

    const breakdown = this.calculator.compute(context, settings, laborRatePerMinute, overheadRatePerMinute, defaultWaxUnitCost);
    const prices = suggestPrices(breakdown.unitTotalCost, {
      retailMarkupPct: settings.retailMarkupPct.toNumber(),
      wholesaleMarkupPct: settings.wholesaleMarkupPct.toNumber(),
      roundingMultiple: settings.roundingMultiple.toNumber(),
      minMarginPct: settings.minMarginPct.toNumber(),
    });

    return { breakdown, prices };
  }
}
