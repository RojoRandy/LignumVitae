// Aritmetica de dinero del proyecto. Nunca usar `number` para sumar precios o
// costos: 0.1 + 0.2 !== 0.3 en punto flotante, y en un catalogo de cientos de
// renglones ese error se acumula. Todo pasa por Decimal.js.
//
// Tres precisiones, no una sola, porque mezclarlas es exactamente el bug que
// tenia el Excel: la cera cuesta $0.0989/g y si esa tasa se redondea a 2
// decimales ($0.10) el catalogo completo se encarece 1.1%. Ver
// packages/types/src/costing/README.md para la justificacion completa.
//
//   round2  dinero que se COBRA o se PAGA (precios, totales, abonos)
//   round6  costos unitarios y tasas ($/g, $/min, $/pieza de insumo)
//   round3  cantidades y existencias en unidad base (gramos, piezas, ml)
import Decimal from 'decimal.js';

export type MoneyInput = Decimal.Value;

export const money = (value: MoneyInput): Decimal => new Decimal(value ?? 0);

/** Redondeo comercial a 2 decimales (half-up). Lo que se cobra o se paga. */
export const round2 = (value: MoneyInput): Decimal =>
  money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** Costos unitarios y tasas. Precision fina para que no se pierda el $0.0989/g. */
export const round6 = (value: MoneyInput): Decimal =>
  money(value).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);

/** Cantidades en unidad base (Decimal(14,3) en la base de datos). */
export const round3 = (value: MoneyInput): Decimal =>
  money(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

/**
 * Redondeo del precio SUGERIDO: siempre hacia arriba al multiplo dado
 * (por defecto $1.00). Redondear un precio hacia abajo solo puede comerse
 * margen; hacia arriba solo puede sumar. El redondeo a mano del Excel bajo
 * el precio en 55 de 112 modelos de menudeo — este es el reemplazo.
 */
export const ceilToMultiple = (value: MoneyInput, multiple: MoneyInput = 1): Decimal => {
  const m = money(multiple);
  if (m.lessThanOrEqualTo(0)) return round2(value);
  return round2(money(value).dividedBy(m).ceil().times(m));
};

/** Convierte a `number` de JS solo para servializar en una respuesta o un test. */
export const toNumber = (value: MoneyInput): number => money(value).toNumber();

/** Formatea como pesos mexicanos, para PDFs y para la UI del admin. */
export const formatMoney = (value: MoneyInput): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(toNumber(value));
