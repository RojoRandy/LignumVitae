// Costea una combinacion de renglones SIN guardar nada, para el panel "en
// vivo" del editor de cotizacion. Comparte toda la formula con
// CreateQuotationUseCase.computePricing -- la unica diferencia es que aqui
// nunca se persiste ni se genera folio.
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../../settings/settings.service';
import { CreateQuotationUseCase, type QuotationPricingResult } from './create-quotation.usecase';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import { PreviewQuotationTotalsDto } from '../dto/preview-quotation-totals.dto';

export type PreviewQuotationTotalsResult = Pick<QuotationPricingResult, 'totals'> & {
  items: { unitTotalCost: number }[];
};

@Injectable()
export class PreviewQuotationTotalsUseCase implements UseCase<PreviewQuotationTotalsDto, PreviewQuotationTotalsResult> {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly createQuotationUseCase: CreateQuotationUseCase,
  ) {}

  async execute(dto: PreviewQuotationTotalsDto): Promise<PreviewQuotationTotalsResult> {
    const settings = await this.settingsService.get();
    const { totals, costings } = await this.createQuotationUseCase.computePricing(dto.items, dto, settings);
    return { totals, items: costings.map((c) => ({ unitTotalCost: c.unitTotalCost })) };
  }
}
