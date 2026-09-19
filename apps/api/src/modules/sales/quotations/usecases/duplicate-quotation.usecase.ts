// Duplicar = cotizar de nuevo HOY: se vuelve a correr todo el costeo contra
// Settings/precios actuales, no se clonan los bytes de la cotizacion vieja.
// Si el cliente vuelve seis meses despues, la copia refleja el costo de
// hoy, no el de entonces.
import { Injectable } from '@nestjs/common';
import { QuotationRepository, type QuotationWithRelations } from '../quotation.repository';
import { CreateQuotationUseCase } from './create-quotation.usecase';
import { SalesErrors } from '../../../../common/errors/sales.errors';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import type { CreateQuotationDto, CreateQuotationItemDto } from '../dto/create-quotation.dto';

export interface DuplicateQuotationArgs {
  id: number;
  userId?: number;
}

@Injectable()
export class DuplicateQuotationUseCase implements UseCase<DuplicateQuotationArgs, QuotationWithRelations> {
  constructor(
    private readonly quotationRepository: QuotationRepository,
    private readonly createQuotationUseCase: CreateQuotationUseCase,
  ) {}

  async execute({ id, userId }: DuplicateQuotationArgs): Promise<QuotationWithRelations> {
    const source = await this.quotationRepository.findById(id);
    if (!source) throw SalesErrors.Exceptions.QUOTATION_NOT_FOUND({ id });

    const items: CreateQuotationItemDto[] = source.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      candleColor: item.candleColor ?? undefined,
      ribbonColor: item.ribbonColor ?? undefined,
      extraFields: item.extraFields as unknown as CreateQuotationItemDto['extraFields'],
      withFragrance: item.withFragrance,
      fragranceSupplyId: item.fragranceSupplyId ?? undefined,
      personalizationText: item.personalizationText ?? undefined,
      setupMinutesOverride: item.setupMinutesOverride ?? undefined,
      // Solo se conserva el override si de verdad hubo un ajuste manual.
      // OJO: unitPrice YA incluye el recargo de aroma, asi que compararlo
      // contra unitListPrice detecta aroma como si fuera un override falso.
      // priceVariance es la comparacion correcta: se calcula ANTES de sumar
      // el aroma (ver calculateQuotationTotals), asi que solo es distinto
      // de cero cuando de verdad hubo un unitPriceOverride manual.
      unitPriceOverride: item.priceVariance.toNumber() !== 0 ? item.unitListPrice.toNumber() + item.priceVariance.toNumber() : undefined,
    }));

    const dto: CreateQuotationDto = {
      customerId: source.customerId,
      eventDate: source.eventDate?.toISOString().slice(0, 10),
      notes: source.notes ?? undefined,
      terms: source.terms ?? undefined,
      discountEnabled: source.discountEnabled,
      discountType: source.discountType,
      discountValue: source.discountValue.toNumber(),
      shippingCost: source.shippingCost.toNumber(),
      items,
    };

    return this.createQuotationUseCase.execute({ dto, userId });
  }
}
