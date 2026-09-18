// Query "en vivo" del panel de costo del asistente: cada vez que cambia la
// combinacion de vela/empaque/tarjeta/componentes, se vuelve a pedir el
// costo a POST /products/preview-cost SIN guardar nada. TanStack Query
// deduplica por queryKey, asi que no dispara una peticion por cada tecla.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { httpPost } from '@/lib/http';
import type { ProductCostBreakdownJson } from '@/lib/types';

export interface PreviewCostInput {
  kind: 'SIMPLE' | 'BOUQUET';
  candleId?: number | null;
  packagingTypeId?: number | null;
  cardTypeId?: number | null;
  extraSetupMinutes?: number;
  extraPackMinutes?: number;
  assemblyMinutes?: number;
  components?: { candleId: number; quantity: number }[];
  excludedSupplyIds?: number[];
  additionalSupplies?: { supplyId: number; quantity: number; unitId: number }[];
}

export interface PreviewCostResult {
  breakdown: ProductCostBreakdownJson;
  prices: {
    retail: { rawPrice: number; suggestedPrice: number; markupPct: number; marginPct: number };
    wholesale: { rawPrice: number; suggestedPrice: number; markupPct: number; marginPct: number };
  };
}

const isReady = (input: PreviewCostInput) =>
  input.kind === 'SIMPLE' ? Boolean(input.candleId) : Boolean(input.components?.length);

export const useProductCostPreview = (input: PreviewCostInput) =>
  useQuery({
    queryKey: ['products', 'preview-cost', input],
    queryFn: () => httpPost<PreviewCostResult>('/products/preview-cost', input),
    enabled: isReady(input),
    placeholderData: keepPreviousData,
  });
