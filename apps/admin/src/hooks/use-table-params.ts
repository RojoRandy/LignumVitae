// page/search/onlyActive viven en la URL, no en useState: refrescar la
// pagina o compartir el link conserva el filtro. El search se debounce
// 300ms antes de disparar la query.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

export const useTableParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const searchParam = searchParams.get('search') ?? '';
  const onlyActive = searchParams.get('all') !== '1';

  const [search, setSearch] = useState(searchParam);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search === searchParam) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search) next.set('search', search);
        else next.delete('search');
        next.set('page', '1');
        return next;
      });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
