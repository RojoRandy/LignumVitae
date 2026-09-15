import { useQuery } from '@tanstack/react-query';
import { httpGet } from '@/lib/http';
import type { Paginated, SupplyTypeDto } from '@/lib/types';

export const useSupplyTypeOptions = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['supply-types', 'options'],
    queryFn: () => httpGet<Paginated<SupplyTypeDto>>('/supply-types', { limit: 100 }),
    staleTime: 30_000,
  });

  const supplyTypes = data?.items ?? [];
  const options = supplyTypes.map((type) => ({ value: String(type.id), label: type.name }));

  return { supplyTypes, options, isLoading };
};
