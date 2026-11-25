import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeFilterCount, categoryFromHash, parsePrice, facetVisible, filtersFromSearch, filtersToSearch, flattenCatalog, matchesFilters, normalizeText, resultsLabel } from './catalog-filter.ts';

const card = { name: 'Vela Corazón', category: 'flores', candles: ['rosa', 'girasol'], packaging: 'caja', retail: 120 };
const emptyFilters = { categories: [], candles: [], packagings: [], query: '', priceMin: null, priceMax: null };

test('matchesFilters sin filtros muestra la tarjeta', () => {
  assert.equal(matchesFilters(card, emptyFilters), true);
});

test('matchesFilters filtra por categoría', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, categories: ['flores'] }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, categories: ['corazones'] }), false);
});

test('matchesFilters acepta cualquiera de los moldes de la tarjeta', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, candles: ['girasol'] }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, candles: ['corazon'] }), false);
});

test('matchesFilters exige coincidencia entre categoría y molde', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, categories: ['flores'], candles: ['rosa'] }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, categories: ['flores'], candles: ['corazon'] }), false);
  assert.equal(matchesFilters(card, { ...emptyFilters, categories: ['corazones'], candles: ['rosa'] }), false);
});

test('matchesFilters filtra por empaque', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, packagings: ['caja'] }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, packagings: ['bolsa'] }), false);
});

test('matchesFilters aplica OR dentro de cada grupo', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, categories: ['corazones', 'flores'] }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, candles: ['corazon', 'rosa'] }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, packagings: ['bolsa', 'caja'] }), true);
});

test('normalizeText quita acentos, mayúsculas y espacios alrededor', () => {
  assert.equal(normalizeText('  Corazón '), 'corazon');
});

test('matchesFilters busca por nombre sin acentos', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, query: 'corazon' }), true);
});

test('matchesFilters busca por nombre sin importar mayúsculas', () => {
  assert.equal(matchesFilters({ ...card, name: 'Osito Chico' }, { ...emptyFilters, query: 'OSITO' }), true);
});

test('matchesFilters no filtra una búsqueda de solo espacios', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, query: '   ' }), true);
});

test('matchesFilters descarta nombres que no coinciden con la búsqueda', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, query: 'osito' }), false);
});

test('matchesFilters exige coincidencia de búsqueda y categoría', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, query: 'corazon', categories: ['corazones'] }), false);
});

test('facetVisible muestra facetas sin filtro o compartidas con una categoría seleccionada', () => {
  assert.equal(facetVisible(['flores'], []), true);
  assert.equal(facetVisible(['corazones'], ['flores']), false);
  assert.equal(facetVisible(['corazones', 'flores'], ['flores']), true);
});

test('categoryFromHash acepta solo slugs válidos y tolera hashes malformados', () => {
  const validSlugs = ['flores', 'figuras-religiosas'];
  const cases: [string, string | null][] = [
    ['#flores', 'flores'], ['#figuras-religiosas', 'figuras-religiosas'],
    ['#FLORES', null], ['#no-existe', null], ['', null], ['#', null],
    ['#%E0', null], ['#flores%20', null], ['#%66lores', 'flores'],
  ];
  for (const [hash, expected] of cases) assert.equal(categoryFromHash(hash, validSlugs), expected, hash);
});

const catalog = [
  { slug: 'flores', products: [
    { slug: 'rosa', isFeatured: false },
    { slug: 'girasol', isFeatured: true },
    { slug: 'tulipan', isFeatured: false },
  ] },
  { slug: 'corazones', products: [
    { slug: 'corazon-grande', isFeatured: true },
    { slug: 'corazon-pequeno', isFeatured: false },
    { slug: 'corazon-doble', isFeatured: true },
  ] },
];

test('flattenCatalog conserva el conteo total', () => {
  assert.equal(flattenCatalog(catalog).length, catalog.reduce((total, category) => total + category.products.length, 0));
});

test('flattenCatalog conserva el slug de categoría de cada producto', () => {
  const items = flattenCatalog(catalog);
  for (const category of catalog) {
    for (const product of category.products) {
      assert.equal(items.find((item) => item.product === product)?.categorySlug, category.slug);
    }
  }
});

test('flattenCatalog coloca destacados de categorías posteriores antes de no destacados de la primera', () => {
  const slugs = flattenCatalog(catalog).map(({ product }) => product.slug);
  assert.ok(slugs.indexOf('corazon-grande') < slugs.indexOf('rosa'));
  assert.ok(slugs.indexOf('corazon-doble') < slugs.indexOf('rosa'));
});

test('flattenCatalog mantiene el orden relativo dentro de destacados y no destacados', () => {
  assert.deepEqual(flattenCatalog(catalog).map(({ product }) => product.slug), [
    'girasol', 'corazon-grande', 'corazon-doble', 'rosa', 'tulipan', 'corazon-pequeno',
  ]);
});

test('flattenCatalog no agrega items por categorías vacías', () => {
  assert.deepEqual(flattenCatalog([]), []);
  assert.deepEqual(flattenCatalog([{ slug: 'vacia', products: [] }]), []);
  assert.deepEqual(flattenCatalog([catalog[0], { slug: 'vacia', products: [] }, catalog[1]]), flattenCatalog(catalog));
});

test('activeFilterCount suma las selecciones de categoría, molde y empaque', () => {
  assert.equal(activeFilterCount(emptyFilters), 0);
  assert.equal(activeFilterCount({ categories: ['flores'], candles: ['rosa', 'girasol'], packagings: ['caja'] }), 4);
});

test('resultsLabel muestra el conteo con singular o plural', () => {
  assert.equal(resultsLabel(0), 'Ver 0 productos');
  assert.equal(resultsLabel(1), 'Ver 1 producto');
  assert.equal(resultsLabel(29), 'Ver 29 productos');
});

const valid = { categories: ['flores', 'corazones'], candles: ['rosa', 'girasol'], packagings: ['caja', 'bolsa'] };

test('filtersToSearch omite los grupos vacíos y usa claves de una letra', () => {
  assert.equal(filtersToSearch(emptyFilters), '');
  assert.equal(filtersToSearch({ ...emptyFilters, query: '   ' }), '');
  assert.equal(filtersToSearch({ ...emptyFilters, categories: ['flores', 'corazones'], candles: ['rosa'], packagings: ['caja'] }), '?c=flores,corazones&m=rosa&e=caja');
});

test('filtersToSearch codifica la búsqueda con + para los espacios', () => {
  assert.equal(filtersToSearch({ ...emptyFilters, query: ' vela corazón ' }), '?q=vela+coraz%C3%B3n');
  assert.equal(filtersToSearch({ ...emptyFilters, query: 'a&b=c,d' }), '?q=a%26b%3Dc%2Cd');
});

test('filtersFromSearch lee lo que escribe filtersToSearch', () => {
  const state = { categories: ['corazones', 'flores'], candles: ['girasol'], packagings: ['bolsa'], query: 'vela coraz\u00f3n & más', priceMin: 50, priceMax: 150.5 };
  assert.deepEqual(filtersFromSearch(filtersToSearch(state), valid), state);
});

test('filtersFromSearch descarta slugs inválidos o repetidos y tolera parámetros ausentes', () => {
  assert.deepEqual(filtersFromSearch('', valid), emptyFilters);
  assert.deepEqual(filtersFromSearch('?c=flores,,no-existe,flores&m=FLORES&x=1', valid), { ...emptyFilters, categories: ['flores'] });
  assert.deepEqual(filtersFromSearch('?c=%E0&q=%E0', valid), { ...emptyFilters, query: '\uFFFD' });
});

test('filtersFromSearch acepta comas codificadas entre slugs', () => {
  assert.deepEqual(filtersFromSearch('?c=flores%2Ccorazones', valid).categories, ['flores', 'corazones']);
});

test('matchesFilters filtra por rango de menudeo con límites inclusivos', () => {
  assert.equal(matchesFilters(card, { ...emptyFilters, priceMin: 100, priceMax: 150 }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, priceMin: 120, priceMax: 120 }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, priceMin: 121 }), false);
  assert.equal(matchesFilters(card, { ...emptyFilters, priceMax: 119 }), false);
  assert.equal(matchesFilters(card, { ...emptyFilters, priceMin: 50 }), true);
  assert.equal(matchesFilters(card, { ...emptyFilters, priceMax: 200 }), true);
});

test('matchesFilters oculta productos sin menudeo solo si hay filtro de precio', () => {
  const sinPrecio = { ...card, retail: null };
  assert.equal(matchesFilters(sinPrecio, emptyFilters), true);
  assert.equal(matchesFilters(sinPrecio, { ...emptyFilters, priceMin: 0 }), false);
  assert.equal(matchesFilters(sinPrecio, { ...emptyFilters, priceMax: 1000 }), false);
});

test('filtersToSearch y filtersFromSearch manejan pmin y pmax', () => {
  assert.equal(filtersToSearch({ ...emptyFilters, priceMin: 50, priceMax: 150 }), '?pmin=50&pmax=150');
  assert.equal(filtersToSearch({ ...emptyFilters, priceMin: 0 }), '?pmin=0');
  assert.deepEqual(filtersFromSearch('?pmin=50&pmax=150', valid), { ...emptyFilters, priceMin: 50, priceMax: 150 });
  assert.deepEqual(filtersFromSearch('?pmin=abc&pmax=-5', valid), emptyFilters);
  assert.deepEqual(filtersFromSearch('?pmin=&pmax=Infinity', valid), emptyFilters);
});

test('parsePrice acepta solo números finitos no negativos', () => {
  assert.equal(parsePrice('0'), 0);
  assert.equal(parsePrice(' 99.5 '), 99.5);
  for (const value of [null, undefined, '', '  ', 'abc', '-1', 'Infinity']) assert.equal(parsePrice(value), null, String(value));
});

test('activeFilterCount cuenta el rango de precio como un filtro', () => {
  assert.equal(activeFilterCount({ ...emptyFilters, priceMin: 50 }), 1);
  assert.equal(activeFilterCount({ ...emptyFilters, priceMin: 50, priceMax: 150, categories: ['flores'] }), 2);
});
