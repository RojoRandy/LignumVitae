import { describe, expect, it } from 'vitest';
import { ceilToMultiple, formatMoney, round2, round3, round6, toNumber } from './money';

describe('money', () => {
  it('round2 redondea half-up a 2 decimales', () => {
    expect(round2(1.005).toNumber()).toBe(1.01);
    expect(round2(7.63).toNumber()).toBe(7.63);
  });

  it('round6 conserva precision fina para tasas ($/g de cera)', () => {
    // La cera real cuesta $1978 / 20000g = $0.0989/g. A 2 decimales se
    // redondearia a $0.10 (+1.1%); round6 lo conserva exacto.
    expect(round6(1978 / 20000).toNumber()).toBe(0.0989);
    expect(round2(1978 / 20000).toNumber()).toBe(0.1);
  });

  it('round3 se usa para cantidades en unidad base', () => {
    expect(round3(1.23456).toNumber()).toBe(1.235);
  });

  it('ceilToMultiple siempre redondea HACIA ARRIBA, nunca hacia abajo', () => {
    expect(ceilToMultiple(10.66, 1).toNumber()).toBe(11);
    expect(ceilToMultiple(9.5, 1).toNumber()).toBe(10);
    expect(ceilToMultiple(10.0, 1).toNumber()).toBe(10);
    expect(ceilToMultiple(10.01, 0.5).toNumber()).toBe(10.5);
  });

  it('ceilToMultiple con multiplo <= 0 cae a round2', () => {
    expect(ceilToMultiple(10.666, 0).toNumber()).toBe(10.67);
  });

  it('toNumber y formatMoney sirven para servializar', () => {
    expect(toNumber('12.5')).toBe(12.5);
    expect(formatMoney(1234.5)).toMatch(/\$/);
  });
});
