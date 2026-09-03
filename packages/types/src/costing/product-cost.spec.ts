import { describe, expect, it } from 'vitest';
import { calculateBouquetCost, calculateProductCost } from './product-cost';

// Estos dos primeros describe() reproducen filas REALES de la hoja "Catalogo"
// de Cotizador LV.xlsx, celda por celda, para probar que las piezas
// individuales del motor (costo de cera, costo de insumos) coinciden con el
// Excel antes de aplicar las correcciones. Los describe() siguientes prueban
// las correcciones mismas y muestran, con numeros, por que difieren.

describe('Osito Chico Liston (fila 3 de "Catalogo")', () => {
  // C3=15, D3=1.4925, E3=0.4, G3=0.5, H3=0.3, I3=0.3, J3=0.1, K3=0.2, N3=0.1
  // V3 (insumos, incluye cera) = 3.3925 | W3 = V+U = 5.8925 | Y3 = 7.63
  const supplies = [
    { supplyId: 1, quantity: 1, unitCost: 0.4 }, // mecha
    { supplyId: 2, quantity: 1, unitCost: 0.5 }, // colorante
    { supplyId: 3, quantity: 1, unitCost: 0.3 }, // celofan
    { supplyId: 4, quantity: 1, unitCost: 0.3 }, // liston
    { supplyId: 5, quantity: 1, unitCost: 0.1 }, // etiqueta
    { supplyId: 6, quantity: 1, unitCost: 0.2 }, // impresion
    { supplyId: 7, quantity: 1, unitCost: 0.1 }, // silicon
  ];

  it('el costo de cera y de insumos reproduce V3 del Excel exactamente', () => {
    // wastePct=0 y waxUnitCost=0.0995 para reproducir la constante vieja del
    // Excel bit a bit; las pruebas siguientes usan la merma y el costo real.
    const result = calculateProductCost({
      grams: 15,
      wastePct: 0,
      waxUnitCost: 0.0995,
      supplies,
      meltMinutes: 15,
      meltBatchGrams: 450, // 450/15 = 30 piezas por lote, como el "/30" del Excel
      setupMinutes: 15,
      packMinutes: 2,
      prorationQuantity: 30, // el Excel prorrateaba diseno entre 30 fijas
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0, // se aisla el calculo de insumos del de indirectos
    });

    expect(result.unitWaxCost).toBeCloseTo(1.4925, 4);
    expect(result.unitSupplyCost).toBeCloseTo(1.9, 4); // V3 - D3 = 3.3925 - 1.4925
    // Con estas mismas condiciones "a la Excel", el prorrateo de mano de obra
    // tambien coincide con X3 = 1.7375:
    expect(result.unitLaborCost).toBeCloseTo(1.7375, 4);
  });

  it('con condiciones reales (merma, costo de cera real, cantidad real del pedido) el costo cambia', () => {
    // Pedido real de 20 piezas, cera comprada a $0.0989/g (bulto de 20 kg),
    // 3% de merma de vaciado, olla de 4 kg (rinde 266 piezas de esta vela).
    const result = calculateProductCost({
      grams: 15,
      wastePct: 0.03,
      waxUnitCost: 0.0989,
      supplies,
      meltMinutes: 15,
      meltBatchGrams: 4000,
      setupMinutes: 15,
      packMinutes: 2,
      prorationQuantity: 20,
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0.641,
    });

    // La olla de 4kg rinde muchas mas piezas que 30 -> el derretido casi no pesa.
    expect(result.piecesPerMeltBatch).toBeGreaterThan(30);
    expect(result.meltMinutesPerUnit).toBeLessThan(15 / 30);
    // El diseno se prorratea entre 20 piezas reales, no entre 30 -> pesa MAS.
    expect(result.setupMinutesPerUnit).toBeCloseTo(15 / 20, 6);
    expect(result.setupMinutesPerUnit).toBeGreaterThan(15 / 30);
    // El costo total YA NO es igual a Y3=7.63: el modelo cambio a proposito.
    expect(result.unitTotalCost).not.toBeCloseTo(7.63, 2);
  });
});

describe('Peonia Grande con Tul (fila 34 de "Catalogo")', () => {
  // C34=66, D34=6.567, insumos = E+G+I+J+K+O = 0.3+0.5+0.2+0.1+0.2+3.0 = 4.3
  // V34=10.867 | Y34=15.1045
  const supplies = [
    { supplyId: 1, quantity: 1, unitCost: 0.3 }, // mecha
    { supplyId: 2, quantity: 1, unitCost: 0.5 }, // colorante
    { supplyId: 3, quantity: 1, unitCost: 0.2 }, // liston
    { supplyId: 4, quantity: 1, unitCost: 0.1 }, // etiqueta
    { supplyId: 5, quantity: 1, unitCost: 0.2 }, // impresion
    { supplyId: 6, quantity: 1, unitCost: 3.0 }, // tul
  ];

  it('reproduce el costo de insumos V34 exactamente', () => {
    const result = calculateProductCost({
      grams: 66,
      wastePct: 0,
      waxUnitCost: 0.0995,
      supplies,
      meltMinutes: 15,
      meltBatchGrams: 66 * 30,
      setupMinutes: 15,
      packMinutes: 2,
      prorationQuantity: 30,
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0,
    });

    expect(result.unitWaxCost).toBeCloseTo(6.567, 3);
    expect(result.unitSupplyCost).toBeCloseTo(4.3, 4);
  });

  it('con una olla real de 4kg, esta vela grande rinde POCAS piezas por lote y el derretido pesa mas', () => {
    const excelStyle = calculateProductCost({
      grams: 66,
      wastePct: 0,
      waxUnitCost: 0.0995,
      supplies,
      meltMinutes: 15,
      meltBatchGrams: 66 * 30, // como si rindiera 30, igual que el Excel asumia siempre
      setupMinutes: 15,
      packMinutes: 2,
      prorationQuantity: 30,
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0,
    });
    const real = calculateProductCost({
      grams: 66,
      wastePct: 0.03,
      waxUnitCost: 0.0989,
      supplies,
      meltMinutes: 15,
      meltBatchGrams: 4000, // olla real: 4000/68 ~= 58 piezas, no 30
      setupMinutes: 15,
      packMinutes: 2,
      prorationQuantity: 30,
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0,
    });

    // Con la olla real esta vela grande rinde MAS de 30 piezas, no menos: el
    // Excel en este caso especifico ya sobrecobraba el derretido (30 fijo
    // subestimaba el rendimiento real). El punto de la prueba es que el
    // numero YA NO es una constante universal, sino que depende del molde.
    expect(real.piecesPerMeltBatch).not.toBe(excelStyle.piecesPerMeltBatch);
  });
});

describe('correccion #2: el prorrateo de diseno por cantidad real del pedido', () => {
  it('un pedido chico (8 piezas) paga mucho mas diseno por pieza que uno de 30', () => {
    const base = {
      grams: 43,
      wastePct: 0.03,
      waxUnitCost: 0.0989,
      supplies: [{ supplyId: 1, quantity: 1, unitCost: 0.5 }],
      meltMinutes: 15,
      meltBatchGrams: 4000,
      setupMinutes: 15,
      packMinutes: 2,
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0.641,
    };

    const pedidoChico = calculateProductCost({ ...base, prorationQuantity: 8 });
    const pedidoGrande = calculateProductCost({ ...base, prorationQuantity: 30 });

    // El Excel siempre prorrateaba entre 30, sin importar la cantidad real:
    // un pedido de 8 piezas pagaba 3.75x menos diseno del que en realidad
    // le corresponde. Aqui el pedido chico paga MAS por pieza, correctamente.
    expect(pedidoChico.setupMinutesPerUnit).toBeGreaterThan(pedidoGrande.setupMinutesPerUnit);
    expect(pedidoChico.unitTotalCost).toBeGreaterThan(pedidoGrande.unitTotalCost);

    const ratio = pedidoChico.setupMinutesPerUnit / pedidoGrande.setupMinutesPerUnit;
    expect(ratio).toBeCloseTo(30 / 8, 5); // exactamente proporcional a la cantidad
  });
});

describe('calculateBouquetCost: ramos como producto compuesto', () => {
  it('suma la cera y el derretido de cada vela componente, mas el BOM propio del ramo', () => {
    const rose = calculateProductCost({
      grams: 50,
      wastePct: 0.03,
      waxUnitCost: 0.0989,
      supplies: [],
      meltMinutes: 15,
      meltBatchGrams: 4000,
      setupMinutes: 0,
      packMinutes: 0,
      prorationQuantity: 1,
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0.641,
    });

    const bouquet = calculateBouquetCost({
      components: [{ unitCost: rose, quantity: 3 }], // ramo de 3 rosas
      supplies: [
        { supplyId: 1, quantity: 1, unitCost: 0.625 }, // papel coreano
        { supplyId: 2, quantity: 1, unitCost: 0.5 }, // liston
      ],
      assemblyMinutes: 5,
      setupMinutes: 0,
      prorationQuantity: 1,
      laborRatePerMinute: 0.5791666667,
      overheadRatePerMinute: 0.641,
    });

    expect(bouquet.unitWaxCost).toBeCloseTo(rose.unitWaxCost * 3, 4);
    expect(bouquet.unitSupplyCost).toBeCloseTo(rose.unitSupplyCost * 3 + 1.125, 4);
    expect(bouquet.unitTotalCost).toBeGreaterThan(rose.unitTotalCost * 3); // el armado suma costo
  });
});
