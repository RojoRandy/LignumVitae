import { useQuery } from '@tanstack/react-query';
import { httpGet } from '@/lib/http';
import type { Paginated, ProductDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';

export const useProductOptions = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'options'],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', { limit: 500 }),
    staleTime: 30_000,
  });

  const products = (data?.items ?? []).filter((p) => p.isActive);
  const options = products.map((p) => ({
    value: String(p.id),
    label: p.name,
    hint: `${formatMoney(p.retailPriceOverride ?? p.retailListPrice)} sugerido`,
  }));

  return { products, options, isLoading };
};
