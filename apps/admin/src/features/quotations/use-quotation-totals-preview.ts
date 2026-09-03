// Query "en vivo" del panel de totales del editor de cotizacion: se
// recalcula contra POST /quotations/preview-totals SIN guardar nada, cada
// vez que cambian los renglones o los ajustes. El guardado real vuelve a
// correr exactamente el mismo calculo en el servidor -- esto es solo
// vista previa, la fuente de la verdad siempre es POST/PATCH /quotations.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { httpPost } from '@/lib/http';
import type { AdjustmentTypeValue, PreviewQuotationTotalsResult } from '@/lib/types';

export interface QuotationLineInput {
  productId: number;
  quantity: number;
  candleColor?: string;
  ribbonColor?: string;
  withFragrance?: boolean;
  fragranceName?: string;
  personalizationText?: string;
  setupMinutesOverride?: number;
  unitPriceOverride?: number;
}

export interface PreviewQuotationTotalsInput {
  items: QuotationLineInput[];
  discountEnabled?: boolean;
  discountType?: AdjustmentTypeValue;
  discountValue?: number;
  shippingCost?: number;
}

const isReady = (input: PreviewQuotationTotalsInput) => input.items.length > 0 && input.items.every((i) => i.productId && i.quantity > 0);

export const useQuotationTotalsPreview = (input: PreviewQuotationTotalsInput) =>
  useQuery({
    queryKey: ['quotations', 'preview-totals', input],
    queryFn: () => httpPost<PreviewQuotationTotalsResult>('/quotations/preview-totals', input),
    enabled: isReady(input),
    placeholderData: keepPreviousData,
  });
