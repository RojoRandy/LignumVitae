// Opciones de insumo para los Combobox. Por defecto excluye la cera (nunca
// se agrega como ProductSupply de un producto: se deriva de los gramos de
// la vela) — pero las Compras SI necesitan poder elegirla, porque es lo
// primero que se compra. Ahi se llama con includeWax: true.
//
// Cual tipo de insumo ES la cera lo dice Settings.waxSupplyTypeId (un id),
// no un slug fijo en el codigo: asi el tipo se puede renombrar o borrar
// desde Catalogo sin romper este filtro. Mientras Configuracion no tenga
// una cera elegida, no hay nada que excluir.
import { useQuery } from '@tanstack/react-query';
import { httpGet } from '@/lib/http';
import { useSettings } from './use-settings';
import type { Paginated, SupplyDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';

export const useSupplyOptions = (opts: { includeWax?: boolean } = {}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['supplies', 'options'],
    queryFn: () => httpGet<Paginated<SupplyDto>>('/supplies', { limit: 200 }),
    staleTime: 30_000,
  });
  const { data: settings } = useSettings();

  const supplies = (data?.items ?? []).filter(
    (s) => opts.includeWax || settings?.waxSupplyTypeId == null || s.typeId !== settings.waxSupplyTypeId,
  );
  const options = supplies.map((s) => ({
    value: String(s.id),
    label: s.name,
    hint: `${formatMoney(s.currentUnitCost)} / ${s.unit.abbr}`,
  }));

  return { supplies, options, isLoading };
};
