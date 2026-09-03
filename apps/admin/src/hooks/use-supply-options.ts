// Opciones de insumo para los Combobox. Por defecto excluye la cera (nunca
// se agrega como ProductSupply de un producto: se deriva de los gramos de
// la vela) — pero las Compras SI necesitan poder elegirla, porque es lo
// primero que se compra. Ahi se llama con includeWax: true.
import { useQuery } from '@tanstack/react-query';
import { httpGet } from '@/lib/http';
import type { Paginated, SupplyDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';

export const useSupplyOptions = (opts: { includeWax?: boolean } = {}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['supplies', 'options'],
    queryFn: () => httpGet<Paginated<SupplyDto>>('/supplies', { limit: 200 }),
    staleTime: 30_000,
  });

  const supplies = (data?.items ?? []).filter((s) => opts.includeWax || s.type !== 'WAX');
  const options = supplies.map((s) => ({
    value: String(s.id),
    label: s.name,
    hint: `${formatMoney(s.currentUnitCost)} / ${s.unit.toLowerCase()}`,
  }));

  return { supplies, options, isLoading };
};
