import { describe, expect, it } from 'vitest';
import { deriveOverheadRate, laborRatePerMinute } from './overhead';

describe('laborRatePerMinute', () => {
  it('reproduce T del Excel: (S/8)/60 con sueldo diario de 278', () => {
    expect(laborRatePerMinute(278, 8)).toBeCloseTo(0.5791666667, 6);
  });
});

describe('correccion #3: deriveOverheadRate reemplaza la constante $2.50 capturada a mano', () => {
  const policy = {
    fallbackRatePerMinute: 0.641,
    minSampleMinutes: 600,
    maxDeviationPct: 50,
  };

  it('con pocos minutos productivos, usa el respaldo (FALLBACK), nunca inventa', () => {
    const result = deriveOverheadRate({
      expenseTotal: 1000,
      producedLaborMinutes: 100, // debajo del piso de 600
      ...policy,
    });
    expect(result.source).toBe('FALLBACK');
    expect(result.ratePerMinute).toBe(0.641);
  });

  it('con muestra suficiente y dentro del rango esperado, deriva la tasa real', () => {
    const result = deriveOverheadRate({
      expenseTotal: 500,
      producedLaborMinutes: 1000, // 0.5 $/min, dentro de +-50% de 0.641
      ...policy,
    });
    expect(result.source).toBe('DERIVED');
    expect(result.ratePerMinute).toBeCloseTo(0.5, 4);
  });

  it('si la tasa cruda se dispara mas de maxDeviationPct%, se acota (CLAMPED)', () => {
    const result = deriveOverheadRate({
      expenseTotal: 5000,
      producedLaborMinutes: 1000, // 5 $/min, muy por encima del respaldo
      ...policy,
    });
    expect(result.source).toBe('CLAMPED');
    expect(result.ratePerMinute).toBeCloseTo(0.641 * 1.5, 4);
  });
});
