import { useQuery } from '@tanstack/react-query';
import { httpGet } from '@/lib/http';
import type { Paginated, UnitOfMeasureDto } from '@/lib/types';

export const useUnitOfMeasureOptions = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['units-of-measure', 'options'],
    queryFn: () => httpGet<Paginated<UnitOfMeasureDto>>('/units-of-measure', { limit: 100 }),
    staleTime: 30_000,
  });

  const units = data?.items ?? [];
  const options = units.map((unit) => ({ value: String(unit.id), label: unit.name }));

  return { units, options, isLoading };
};
