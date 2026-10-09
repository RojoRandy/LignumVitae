import { describe, expect, it } from 'vitest';
import { DROPS_PER_ML, estimateFragranceDrops, estimateFragranceMl } from './fragrance';

describe('estimacion de aroma por gotas', () => {
  it('una vela de 103 g con 20 gotas por 100 g necesita 1.03 ml y 20.6 gotas', () => {
    expect(DROPS_PER_ML).toBe(20);
    const ml = estimateFragranceMl(103, 20);
    expect(ml).toBe(1.03);
    expect(estimateFragranceDrops(ml)).toBe(20.6);
  });

  it.each([
    [15, 0.7725, 15.5],
    [30, 1.545, 30.9],
  ])('estima una carga de %s gotas por 100 g', (dropsPer100g, ml, drops) => {
    expect(estimateFragranceMl(103, dropsPer100g)).toBe(ml);
    expect(estimateFragranceDrops(ml)).toBe(drops);
  });

  it('sin cera o sin carga devuelve cero', () => {
    expect(estimateFragranceMl(0, 20)).toBe(0);
    expect(estimateFragranceMl(103, 0)).toBe(0);
    expect(estimateFragranceDrops(0)).toBe(0);
  });

  it.each([-1, NaN, Infinity, -Infinity])('rechaza entradas negativas o no finitas: %s', (value) => {
    expect(estimateFragranceMl(value, 20)).toBe(0);
    expect(estimateFragranceMl(103, value)).toBe(0);
  });

  it('redondea los ml a seis decimales', () => {
    expect(estimateFragranceMl(1.23456789, 15)).toBe(0.009259);
  });
});
