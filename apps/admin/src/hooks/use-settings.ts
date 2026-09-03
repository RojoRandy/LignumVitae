import { useQuery } from '@tanstack/react-query';
import { httpGet } from '@/lib/http';
import type { SettingsDto } from '@/lib/types';

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: () => httpGet<SettingsDto>('/settings'),
    staleTime: 60_000,
  });
