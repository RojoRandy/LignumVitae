// page/search/onlyActive viven en la URL, no en useState: refrescar la
// pagina o compartir el link conserva el filtro. El debounce de 300ms
// vive en SearchInput de page.tsx, antes de actualizar la URL.
import { useSearchParams } from 'react-router';

export const useTableParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const search = searchParams.get('search') ?? '';
  const onlyActive = searchParams.get('all') !== '1';

  const setSearch = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('search', value);
      else next.delete('search');
      next.set('page', '1');
      return next;
    });
  };

  const setPage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(nextPage));
      return next;
    });
  };

  const setOnlyActive = (value: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.delete('all');
      else next.set('all', '1');
      next.set('page', '1');
      return next;
    });
  };

  return { page, search, setSearch, onlyActive, setOnlyActive, setPage };
};
