import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateLine, estimateTotal, formatPrice, fragranceNote, wholesaleNote } from './price.ts';

test('formatPrice omite centavos en precios enteros', () => {
  assert.equal(formatPrice(120), '$120');
  assert.equal(formatPrice(1250), '$1,250');
});

test('formatPrice conserva centavos cuando los hay', () => {
  assert.equal(formatPrice(120.5), '$120.50');
});

test('wholesaleNote solo aparece con un umbral util', () => {
  assert.equal(wholesaleNote(31), 'Mayoreo a partir de 31 piezas por producto.');
  assert.equal(wholesaleNote(undefined), '');
  assert.equal(wholesaleNote(1), '');
});

test('fragranceNote indica el cargo por pieza', () => {
  assert.equal(fragranceNote(1), 'Con aroma: $1 adicional por pieza.');
  assert.equal(fragranceNote(0), '');
});

const settings = { wholesaleThresholdQty: 31, fragranceSurcharge: 1 };
const prices = { retail: 120, wholesale: 95 };

test('estimateLine usa menudeo debajo del umbral y mayoreo desde el umbral', () => {
  assert.deepEqual(estimateLine({ quantity: 30, withFragrance: false }, prices, settings), { tier: 'retail', unitPrice: 120, lineTotal: 3600 });
  assert.deepEqual(estimateLine({ quantity: 31, withFragrance: false }, prices, settings), { tier: 'wholesale', unitPrice: 95, lineTotal: 2945 });
});

test('estimateLine suma el aroma por pieza', () => {
  assert.deepEqual(estimateLine({ quantity: 10, withFragrance: true }, prices, settings), { tier: 'retail', unitPrice: 121, lineTotal: 1210 });
});

test('estimateLine sin precio del bracket queda a cotizar', () => {
  assert.equal(estimateLine({ quantity: 40, withFragrance: false }, { retail: 120, wholesale: null }, settings), null);
  assert.equal(estimateLine({ quantity: 1, withFragrance: false }, undefined, settings), null);
});

test('estimateTotal suma en centavos y cuenta los renglones a cotizar', () => {
  const a = estimateLine({ quantity: 3, withFragrance: false }, { retail: 0.1, wholesale: null }, settings);
  const b = estimateLine({ quantity: 3, withFragrance: false }, { retail: 0.2, wholesale: null }, settings);
  assert.deepEqual(estimateTotal([a, b, null]), { total: 0.9, pending: 1 });
});
