// Query "en vivo" del panel de totales del editor de cotizacion: se
// recalcula contra POST /quotations/preview-totals SIN guardar nada, cada
// vez que cambian los renglones o los ajustes. El guardado real vuelve a
// correr exactamente el mismo calculo en el servidor -- esto es solo
// vista previa, la fuente de la verdad siempre es POST/PATCH /quotations.
import { useEffect, useState } from 'react';
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

/*
 * Un recosteo completo por TECLA era lo que hacia esto antes: cada digito de
 * un precio manual salia como un POST. Se espera a que el usuario deje de
 * teclear. Es un efecto de tiempo, no estado derivable en el render.
 */
const useDebounced = <T,>(value: T, ms: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
};

export const useQuotationTotalsPreview = (input: PreviewQuotationTotalsInput) => {
  const debouncedInput = useDebounced(input, 300);
  return useQuery({
    queryKey: ['quotations', 'preview-totals', debouncedInput],
    queryFn: () => httpPost<PreviewQuotationTotalsResult>('/quotations/preview-totals', debouncedInput),
    enabled: isReady(debouncedInput),
    placeholderData: keepPreviousData,
  });
};
