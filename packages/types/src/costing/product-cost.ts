// Costo unitario de un producto. Reemplaza las columnas D-Y de la hoja
// "Catalogo" del Excel. Cada formula lleva en el comentario la celda que
// sustituye, para poder auditar contra el archivo original.
//
// La cera NUNCA aparece en `supplies`: se deriva de `grams x waxUnitCost`.
// Si la cera fuera un renglon mas de insumos, cambiar los gramos del molde
// exigiria editar dos lugares y volveriamos al `=0.0995*C` capturado a mano.
import { money, round6 } from './money';

export interface SupplyConsumption {
  supplyId: number;
  /** En la unidad base del insumo (gramos, piezas, ml, cm...). */
  quantity: number;
  /** $ por unidad base, Supply.currentUnitCost. */
  unitCost: number;
}

export interface ProductCostInput {
  /** Candle.grams: gramos de cera de una pieza, SIN merma. */
  grams: number;
  /** Candle.wastePct o Settings.defaultWastePct: merma de vaciado (0.03 = 3%). */
  wastePct: number;
  /** $/g de la cera. Se deriva de compras reales via suggestSupplyUnitCost, nunca es una constante. */
  waxUnitCost: number;
  /** ProductSupply del producto. La cera NUNCA va aqui. */
  supplies: SupplyConsumption[];

  /** Candle.meltMinutes: minutos de derretir y desmoldar de UN LOTE, no de una pieza. */
  meltMinutes: number;
  /** Candle.meltBatchGrams ?? Settings.meltBatchGrams: capacidad de la olla. */
  meltBatchGrams: number;
  /** PackagingType.setupMinutes + CardType.setupMinutes + Product.extraSetupMinutes: minutos POR PEDIDO. */
  setupMinutes: number;
  /** PackagingType.packMinutes + Product.extraPackMinutes: minutos POR PIEZA. */
  packMinutes: number;
  /**
   * Cantidad real del renglon que se esta costeando. El tiempo de diseno se
   * prorratea entre ESTO, no entre 30 como en el Excel. Para el costeo de
   * catalogo (sin una cotizacion concreta todavia) se pasa
   * Settings.wholesaleThresholdQty como cantidad de referencia.
   */
  prorationQuantity: number;

  laborRatePerMinute: number;
  overheadRatePerMinute: number;

  /** null si la pieza se cotiza sin aroma. */
  fragrance?: { unitCost: number; loadPct: number } | null;
}

export interface ProductCostBreakdown {
  waxGramsPerUnit: number;
  piecesPerMeltBatch: number;
  meltMinutesPerUnit: number;
  setupMinutesPerUnit: number;
  packMinutesPerUnit: number;
  laborMinutesPerUnit: number;
  unitWaxCost: number;
  unitSupplyCost: number;
  unitFragranceCost: number;
  unitLaborCost: number;
  unitOverheadCost: number;
  unitTotalCost: number;
}

export const calculateProductCost = (input: ProductCostInput): ProductCostBreakdown => {
  const gramosConMerma = money(input.grams).times(money(1).plus(input.wastePct));

  // [Excel: D = 0.0995 * C] — aqui waxUnitCost viene de compras reales, no de una constante.
  const unitWaxCost = round6(gramosConMerma.times(input.waxUnitCost));

  // [Excel: V = SUM(E2:O2)] — capturado a mano; aqui es la suma del BOM real.
  const unitSupplyCost = round6(
    input.supplies.reduce(
      (acc, s) => acc.plus(money(s.quantity).times(s.unitCost)),
      money(0),
    ),
  );

  // No existia en el Excel: el aroma se cobraba con un "+1" ciego sin costear.
  const unitFragranceCost = input.fragrance
    ? round6(gramosConMerma.times(input.fragrance.loadPct).times(input.fragrance.unitCost))
    : money(0);

  // [Excel: R / 30] — el Excel prorrateaba el derretido entre 30 piezas fijas.
  // Aqui se prorratea entre el rendimiento REAL del lote de esta vela.
  const piecesPerMeltBatch = Math.max(
    1,
    Math.floor(input.meltBatchGrams / gramosConMerma.toNumber()),
  );
  const meltMinutesPerUnit = money(input.meltMinutes).dividedBy(piecesPerMeltBatch);

  // [Excel: P / 30] — el diseno del arte se prorratea entre la cantidad REAL
  // del pedido, no entre 30 fijas. Un pedido de 8 piezas paga 8, no 30.
  const setupMinutesPerUnit = money(input.setupMinutes).dividedBy(
    Math.max(1, input.prorationQuantity),
  );

  // [Excel: Q] — el empaquetado ya era por pieza en el Excel; no se prorratea.
  const packMinutesPerUnit = money(input.packMinutes);

  const laborMinutesPerUnit = meltMinutesPerUnit.plus(setupMinutesPerUnit).plus(packMinutesPerUnit);

  // [Excel: X = ((R*T)/30) + ((P*T)/30) + (Q*T)]
  const unitLaborCost = round6(laborMinutesPerUnit.times(input.laborRatePerMinute));

  // [Excel: U = 2.5 / 1.5 / 1.0, constante capturada a mano]
  const unitOverheadCost = round6(laborMinutesPerUnit.times(input.overheadRatePerMinute));

  // [Excel: Y = SUM(V, U, X)]
  const unitTotalCost = round6(
    unitWaxCost.plus(unitSupplyCost).plus(unitFragranceCost).plus(unitLaborCost).plus(unitOverheadCost),
  );

  return {
    waxGramsPerUnit: gramosConMerma.toNumber(),
    piecesPerMeltBatch,
    meltMinutesPerUnit: meltMinutesPerUnit.toNumber(),
    setupMinutesPerUnit: setupMinutesPerUnit.toNumber(),
    packMinutesPerUnit: packMinutesPerUnit.toNumber(),
    laborMinutesPerUnit: laborMinutesPerUnit.toNumber(),
    unitWaxCost: unitWaxCost.toNumber(),
    unitSupplyCost: unitSupplyCost.toNumber(),
    unitFragranceCost: unitFragranceCost.toNumber(),
    unitLaborCost: unitLaborCost.toNumber(),
    unitOverheadCost: unitOverheadCost.toNumber(),
    unitTotalCost: unitTotalCost.toNumber(),
  };
};

export interface BouquetComponentInput {
  /** Costo ya calculado de la vela componente (calculateProductCost sin empaque propio). */
  unitCost: Pick<ProductCostBreakdown, 'unitWaxCost' | 'unitSupplyCost' | 'meltMinutesPerUnit'>;
  quantity: number;
}

export interface BouquetCostInput {
  components: BouquetComponentInput[];
  /** BOM propio del ramo: papel coreano, liston, etiqueta. La cera de las velas NO va aqui. */
  supplies: SupplyConsumption[];
  /** Minutos de armar el ramo (envolver, atar). Por pieza de ramo, no se prorratea. */
  assemblyMinutes: number;
  /** Minutos de diseno del ramo (si lleva tarjeta o personalizacion), por pedido. */
  setupMinutes: number;
  prorationQuantity: number;
  laborRatePerMinute: number;
  overheadRatePerMinute: number;
  fragrance?: { unitCost: number; loadPct: number; totalGrams: number } | null;
}

/**
 * Costo de un ramo (Product.kind = BOUQUET). Suma la cera y el derretido de
 * cada vela componente y le agrega el BOM y los minutos propios del ramo.
 */
export const calculateBouquetCost = (input: BouquetCostInput): ProductCostBreakdown => {
  const componentsWaxCost = input.components.reduce(
    (acc, c) => acc.plus(money(c.unitCost.unitWaxCost).times(c.quantity)),
    money(0),
  );
  const componentsSupplyCost = input.components.reduce(
    (acc, c) => acc.plus(money(c.unitCost.unitSupplyCost).times(c.quantity)),
    money(0),
  );
  const componentsMeltMinutes = input.components.reduce(
    (acc, c) => acc.plus(money(c.unitCost.meltMinutesPerUnit).times(c.quantity)),
    money(0),
  );

  const bouquetSupplyCost = round6(
    input.supplies.reduce((acc, s) => acc.plus(money(s.quantity).times(s.unitCost)), money(0)),
  );

  const unitFragranceCost = input.fragrance
    ? round6(money(input.fragrance.totalGrams).times(input.fragrance.loadPct).times(input.fragrance.unitCost))
    : money(0);

  const setupMinutesPerUnit = money(input.setupMinutes).dividedBy(Math.max(1, input.prorationQuantity));
  const laborMinutesPerUnit = componentsMeltMinutes.plus(setupMinutesPerUnit).plus(input.assemblyMinutes);

  const unitWaxCost = round6(componentsWaxCost);
  const unitSupplyCost = round6(componentsSupplyCost.plus(bouquetSupplyCost));
  const unitLaborCost = round6(laborMinutesPerUnit.times(input.laborRatePerMinute));
  const unitOverheadCost = round6(laborMinutesPerUnit.times(input.overheadRatePerMinute));
  const unitTotalCost = round6(
    unitWaxCost.plus(unitSupplyCost).plus(unitFragranceCost).plus(unitLaborCost).plus(unitOverheadCost),
  );

  return {
    waxGramsPerUnit: 0, // un ramo no tiene "gramos por unidad" propios: son de sus componentes
    piecesPerMeltBatch: 1,
    meltMinutesPerUnit: componentsMeltMinutes.toNumber(),
    setupMinutesPerUnit: setupMinutesPerUnit.toNumber(),
    packMinutesPerUnit: money(input.assemblyMinutes).toNumber(),
    laborMinutesPerUnit: laborMinutesPerUnit.toNumber(),
    unitWaxCost: unitWaxCost.toNumber(),
    unitSupplyCost: unitSupplyCost.toNumber(),
    unitFragranceCost: unitFragranceCost.toNumber(),
    unitLaborCost: unitLaborCost.toNumber(),
    unitOverheadCost: unitOverheadCost.toNumber(),
    unitTotalCost: unitTotalCost.toNumber(),
  };
};
