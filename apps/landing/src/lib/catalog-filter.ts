export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function matchesFilters(
  card: { name: string; category: string; candles: string[]; packaging: string },
  state: { categories: string[]; candles: string[]; packagings: string[]; query: string },
): boolean {
  const matchesCategory = state.categories.length === 0 || state.categories.includes(card.category);
  const matchesCandle = state.candles.length === 0 || card.candles.some((slug) => state.candles.includes(slug));
  const matchesPackaging = state.packagings.length === 0 || state.packagings.includes(card.packaging);
  const query = normalizeText(state.query);
  const matchesQuery = query === '' || normalizeText(card.name).includes(query);
  return matchesCategory && matchesCandle && matchesPackaging && matchesQuery;
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

export function flattenCatalog<P extends { isFeatured: boolean }>(
  categories: { slug: string; products: P[] }[],
): { product: P; categorySlug: string }[] {
  return categories
    .flatMap((category) => category.products.map((product) => ({ product, categorySlug: category.slug })))
    .sort((a, b) => Number(b.product.isFeatured) - Number(a.product.isFeatured));
}

export function activeFilterCount(state: { categories: string[]; candles: string[]; packagings: string[] }): number {
  return state.categories.length + state.candles.length + state.packagings.length;
}

export function resultsLabel(count: number): string {
  return count === 1 ? 'Ver 1 producto' : `Ver ${count} productos`;
}
