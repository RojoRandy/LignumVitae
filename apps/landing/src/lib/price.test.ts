import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPrice, wholesaleNote } from './price.ts';

test('formatPrice omite centavos en precios enteros', () => {
  assert.equal(formatPrice(120), '$120');
  assert.equal(formatPrice(1250), '$1,250');
});

test('formatPrice conserva centavos cuando los hay', () => {
  assert.equal(formatPrice(120.5), '$120.50');
});

test('wholesaleNote solo aparece con un umbral util', () => {
  assert.equal(wholesaleNote(31), 'Mayoreo a partir de 31 piezas.');
  assert.equal(wholesaleNote(undefined), '');
  assert.equal(wholesaleNote(1), '');
});
