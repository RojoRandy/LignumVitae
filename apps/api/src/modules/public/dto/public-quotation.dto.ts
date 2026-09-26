// Lista blanca de lo que sale por el enlace publico: nunca costo ni margen,
// solo lo que el cliente necesita ver y aceptar. Mismo espiritu que
// SettingsService.getPublic().
import type { Settings } from '@prisma/client';
import type { QuotationWithRelations } from '../../sales/quotations/quotation.repository';
import { toBankAccount } from '../../settings/settings.service';

export const toPublicQuotationDto = (quotation: QuotationWithRelations, settings: Settings) => ({
  folio: quotation.folio,
  status: quotation.status,
  issuedAt: quotation.issuedAt,
  validUntil: quotation.validUntil,
  eventDate: quotation.eventDate,
  customer: { fullName: quotation.customer.fullName, phone: quotation.customer.phone },
  items: quotation.items.map((item) => ({
    productName: item.product.name,
    imageUrl: item.product.images[0]?.url ?? null,
    quantity: item.quantity,
    candleColor: item.candleColor,
    ribbonColor: item.ribbonColor,
    extraFields: item.extraFields,
    withFragrance: item.withFragrance,
    fragranceName: item.fragranceSupply?.name ?? null,
    personalizationText: item.personalizationText,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  })),
  subtotal: quotation.subtotal,
  discountEnabled: quotation.discountEnabled,
  discountAmount: quotation.discountAmount,
  shippingCost: quotation.shippingCost,
  total: quotation.total,
  depositAmount: quotation.depositAmount,
  terms: quotation.terms,
  notes: quotation.notes,
  bankAccount: toBankAccount(settings),
});
