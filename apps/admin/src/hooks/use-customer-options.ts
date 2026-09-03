import { useQuery } from '@tanstack/react-query';
import { httpGet } from '@/lib/http';
import type { CustomerDto, Paginated } from '@/lib/types';

export const useCustomerOptions = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => httpGet<Paginated<CustomerDto>>('/customers', { limit: 200 }),
    staleTime: 30_000,
  });

  const customers = data?.items ?? [];
  const options = customers.map((c) => ({ value: String(c.id), label: c.fullName, hint: c.phone }));

  return { customers, options, isLoading };
};
