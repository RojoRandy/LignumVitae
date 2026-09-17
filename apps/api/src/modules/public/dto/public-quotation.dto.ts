// Lista blanca de lo que sale por el enlace publico: nunca costo ni margen,
// solo lo que el cliente necesita ver y aceptar. Mismo espiritu que
// SettingsService.getPublic().
import type { QuotationWithRelations } from '../../sales/quotations/quotation.repository';

export const toPublicQuotationDto = (quotation: QuotationWithRelations) => ({
  folio: quotation.folio,
  status: quotation.status,
  issuedAt: quotation.issuedAt,
  validUntil: quotation.validUntil,
  eventDate: quotation.eventDate,
  customer: { fullName: quotation.customer.fullName, phone: quotation.customer.phone },
  items: quotation.items.map((item) => ({
    productName: item.product.name,
    quantity: item.quantity,
    candleColor: item.candleColor,
    ribbonColor: item.ribbonColor,
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
});
