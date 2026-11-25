export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function matchesFilters(
  card: { name: string; category: string; candles: string[]; packaging: string; retail: number | null },
  state: FilterState,
): boolean {
  const matchesCategory = state.categories.length === 0 || state.categories.includes(card.category);
  const matchesCandle = state.candles.length === 0 || card.candles.some((slug) => state.candles.includes(slug));
  const matchesPackaging = state.packagings.length === 0 || state.packagings.includes(card.packaging);
  const query = normalizeText(state.query);
  const matchesQuery = query === '' || normalizeText(card.name).includes(query);
  return matchesCategory && matchesCandle && matchesPackaging && matchesQuery && matchesPrice(card.retail, state);
}

// Solo el precio de menudeo. Con filtro activo, "A cotizar" (null) no entra.
function matchesPrice(retail: number | null, { priceMin, priceMax }: FilterState): boolean {
  if (priceMin === null && priceMax === null) return true;
  return retail !== null && (priceMin === null || retail >= priceMin) && (priceMax === null || retail <= priceMax);
}

export function facetVisible(facetCategorySlugs: string[], selectedCategories: string[]): boolean {
  return selectedCategories.length === 0 || facetCategorySlugs.some((slug) => selectedCategories.includes(slug));
}

export function categoryFromHash(hash: string, validSlugs: string[]): string | null {
  try {
    const slug = decodeURIComponent(hash.replace(/^#/, ''));
    return slug && validSlugs.includes(slug) ? slug : null;
  } catch {
    return null;
  }
}

export interface FilterSelection {
  categories: string[];
  candles: string[];
  packagings: string[];
}

export interface FilterState extends FilterSelection {
  query: string;
  /** Rango de precio de menudeo; null = sin limite. */
  priceMin: number | null;
  priceMax: number | null;
}

// Claves de una letra para que el enlace compartido quede corto:
// /catalogo?c=flores,corazones&m=rosa&e=caja&q=osito&pmin=50&pmax=150
const PARAM_KEYS = { categories: 'c', candles: 'm', packagings: 'e' } as const;
const QUERY_KEY = 'q';
const PRICE_KEYS = { priceMin: 'pmin', priceMax: 'pmax' } as const;

/** Un precio valido es un numero finito >= 0; vacio, texto o negativo = sin limite. */
export function parsePrice(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

/** Lee los filtros del query string y descarta slugs que no existen o repetidos. */
export function filtersFromSearch(search: string, valid: FilterSelection): FilterState {
  const params = new URLSearchParams(search);
  const pick = (group: keyof FilterSelection) => {
    const values = (params.get(PARAM_KEYS[group]) ?? '').split(',').filter((slug) => valid[group].includes(slug));
    return [...new Set(values)];
  };
  return {
    categories: pick('categories'),
    candles: pick('candles'),
    packagings: pick('packagings'),
    query: (params.get(QUERY_KEY) ?? '').trim(),
    priceMin: parsePrice(params.get(PRICE_KEYS.priceMin)),
    priceMax: parsePrice(params.get(PRICE_KEYS.priceMax)),
  };
}

/** Arma el query string mas corto posible: omite grupos vacios y separa slugs con coma. */
export function filtersToSearch(state: FilterState): string {
  const parts: string[] = [];
  for (const group of ['categories', 'candles', 'packagings'] as const) {
    if (state[group].length > 0) parts.push(`${PARAM_KEYS[group]}=${state[group].map(encodeURIComponent).join(',')}`);
  }
  const query = state.query.trim();
  if (query) parts.push(`${QUERY_KEY}=${encodeURIComponent(query).replace(/%20/g, '+')}`);
  for (const key of ['priceMin', 'priceMax'] as const) {
    if (state[key] !== null) parts.push(`${PRICE_KEYS[key]}=${state[key]}`);
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export function flattenCatalog<P extends { isFeatured: boolean }>(
  categories: { slug: string; products: P[] }[],
): { product: P; categorySlug: string }[] {
  return categories
    .flatMap((category) => category.products.map((product) => ({ product, categorySlug: category.slug })))
    .sort((a, b) => Number(b.product.isFeatured) - Number(a.product.isFeatured));
}

// El rango de precio cuenta como un solo filtro, tenga uno o los dos limites.
export function activeFilterCount(state: FilterSelection & { priceMin?: number | null; priceMax?: number | null }): number {
  const price = state.priceMin != null || state.priceMax != null ? 1 : 0;
  return state.categories.length + state.candles.length + state.packagings.length + price;
}

export function resultsLabel(count: number): string {
  return count === 1 ? 'Ver 1 producto' : `Ver ${count} productos`;
}
