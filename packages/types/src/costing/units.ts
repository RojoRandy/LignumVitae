// Unidades base para insumos e inventario. Cada Supply guarda su unidad BASE
// (la que usa el motor de costos); estos factores solo sirven para que el
// admin capture compras en la presentacion en la que realmente se compran
// ("2 kilos", "1 rollo") sin obligar a la clienta a hacer la conversion a
// mano, que es exactamente lo que el Excel hacia con `=143.45/3`.
export const UnitOfMeasure = {
  GRAM: 'GRAM',
  KILOGRAM: 'KILOGRAM',
  MILLILITER: 'MILLILITER',
  LITER: 'LITER',
  CENTIMETER: 'CENTIMETER',
  METER: 'METER',
  PIECE: 'PIECE',
  SHEET: 'SHEET',
} as const;

export type UnitOfMeasure = (typeof UnitOfMeasure)[keyof typeof UnitOfMeasure];

/** Cuantas unidades BASE hay en una unidad "grande" del mismo tipo. */
const BASE_FACTOR: Partial<Record<UnitOfMeasure, number>> = {
  [UnitOfMeasure.KILOGRAM]: 1000, // -> GRAM
  [UnitOfMeasure.LITER]: 1000, // -> MILLILITER
  [UnitOfMeasure.METER]: 100, // -> CENTIMETER
};

/** GRAM<->KILOGRAM, MILLILITER<->LITER, CENTIMETER<->METER. PIECE y SHEET no convierten. */
export const convertToBase = (quantity: number, fromUnit: UnitOfMeasure): number => {
  const factor = BASE_FACTOR[fromUnit];
  return factor ? quantity * factor : quantity;
};
