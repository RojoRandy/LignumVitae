import { describe, expect, it } from 'vitest';
import { prorateShipping, suggestSupplyUnitCost } from './supply-cost';

describe('correccion #6: suggestSupplyUnitCost reemplaza el "=143.45/3" capturado a mano', () => {
  it('promedia ponderado por cantidad, no simple: dos bultos de 20kg reproducen el $0.0989/g real', () => {
    const result = suggestSupplyUnitCost({
      samples: [
        { purchasedAt: '2026-01-05', baseQuantity: 20000, landedTotal: 1978 },
        { purchasedAt: '2026-01-20', baseQuantity: 20000, landedTotal: 1978 },
      ],
      asOf: '2026-02-01',
      windowDays: 180,
      maxSamples: 5,
    });
    expect(result.unitCost).toBeCloseTo(0.0989, 4);
    expect(result.sampleSize).toBe(2);
  });

  it('una compra de emergencia pequena NO domina el promedio ponderado', () => {
    const result = suggestSupplyUnitCost({
      samples: [
        { purchasedAt: '2026-01-05', baseQuantity: 20000, landedTotal: 1978 }, // $0.0989/g
        { purchasedAt: '2026-01-05', baseQuantity: 20000, landedTotal: 1978 },
        { purchasedAt: '2026-02-01', baseQuantity: 1000, landedTotal: 130 }, // $0.13/g, urgencia
      ],
      asOf: '2026-02-02',
      windowDays: 180,
      maxSamples: 5,
    });
    // El promedio simple de los tres seria (0.0989+0.0989+0.13)/3 = 0.1093 (+10.5%).
    // El ponderado por cantidad se queda mucho mas cerca del precio real de bulto.
    const simpleAvg = (0.0989 + 0.0989 + 0.13) / 3;
    expect(result.unitCost).toBeLessThan(simpleAvg);
  });

  it('ignora compras fuera de la ventana de dias configurada', () => {
    const result = suggestSupplyUnitCost({
      samples: [{ purchasedAt: '2024-01-01', baseQuantity: 20000, landedTotal: 1978 }],
      asOf: '2026-02-01',
      windowDays: 180,
      maxSamples: 5,
    });
    expect(result.unitCost).toBeNull();
    expect(result.method).toBe('NONE');
  });
});

describe('prorateShipping', () => {
  it('reparte el flete por participacion en el importe y cuadra exacto', () => {
    const allocations = prorateShipping([100, 200, 300], 60);
    const sum = allocations.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(60, 2);
    expect(allocations[2]).toBeGreaterThan(allocations[0]);
  });

  it('sin flete, no reparte nada', () => {
    expect(prorateShipping([100, 200], 0)).toEqual([0, 0]);
  });
});
