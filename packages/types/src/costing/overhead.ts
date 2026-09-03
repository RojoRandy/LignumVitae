// Tasas de mano de obra y de gastos indirectos.
//
// El Excel calculaba `T = (S/8)/60` (sueldo diario / horas / 60) y eso SI
// estaba bien: se conserva igual, solo con las dos constantes en Settings
// en vez de capturadas en una celda.
//
// Los gastos indirectos eran una constante ($2.50 / $1.50 / $1.00) tecleada
// a mano sin ningun registro que la respaldara. Aqui se derivan del cierre
// mensual real: bolsa de gastos entre minutos productivos del mes.
import { money, round6 } from './money';

/** T del Excel: (S/8)/60. Costo de un minuto de trabajo de la duena/empleada. */
export const laborRatePerMinute = (dailyWage: number, workHoursPerDay: number): number =>
  round6(money(dailyWage).dividedBy(workHoursPerDay).dividedBy(60)).toNumber();

export type OverheadRateSource = 'DERIVED' | 'FALLBACK' | 'CLAMPED';

export interface OverheadRateInput {
  /** SUM(Expense WHERE kind=OVERHEAD AND periodMonth=mes), depreciacion incluida. */
  expenseTotal: number;
  /** SUM(orderItem.laborMinutesPerUnit * quantity) de los pedidos ENTREGADOS en el mes. */
  producedLaborMinutes: number;
  /** Settings.overheadRatePerMinute: respaldo cuando no hay muestra suficiente. */
  fallbackRatePerMinute: number;
  /** Settings.overheadMinSampleMinutes: debajo de esto el mes no es muestra confiable. */
  minSampleMinutes: number;
  /** Settings.overheadMaxDeviationPct: la tasa derivada no puede alejarse mas de esto del respaldo. */
  maxDeviationPct: number;
}

export interface OverheadRateResult {
  ratePerMinute: number;
  /** La tasa cruda antes de acotar, para poder explicar por que se acoto. */
  rawRatePerMinute: number;
  source: OverheadRateSource;
}

/**
 * Deriva la tasa de gastos indirectos por minuto productivo.
 *
 * Es deliberadamente PROCICLICA (un mes flojo produce pocos minutos, la tasa
 * sube, el catalogo encarece) y por eso lleva dos frenos: un piso de muestra
 * (un mes con pocos minutos productivos no es una muestra, es una anecdota) y
 * un acotamiento a +-maxDeviationPct% del respaldo. La tasa resultante se
 * CONGELA en cada cotizacion, asi que un cierre malo nunca reprecia lo ya
 * cotizado.
 */
export const deriveOverheadRate = (input: OverheadRateInput): OverheadRateResult => {
  const {
    expenseTotal,
    producedLaborMinutes,
    fallbackRatePerMinute,
    minSampleMinutes,
    maxDeviationPct,
  } = input;

  if (producedLaborMinutes <= 0 || producedLaborMinutes < minSampleMinutes) {
    return {
      ratePerMinute: round6(fallbackRatePerMinute).toNumber(),
      rawRatePerMinute: producedLaborMinutes > 0
        ? round6(money(expenseTotal).dividedBy(producedLaborMinutes)).toNumber()
        : 0,
      source: 'FALLBACK',
    };
  }

  const rawRate = money(expenseTotal).dividedBy(producedLaborMinutes);
  const fallback = money(fallbackRatePerMinute);
  const maxDeviation = fallback.times(maxDeviationPct).dividedBy(100);
  const lowerBound = fallback.minus(maxDeviation);
  const upperBound = fallback.plus(maxDeviation);

  let clamped = rawRate;
  let source: OverheadRateSource = 'DERIVED';
  if (rawRate.lessThan(lowerBound)) {
    clamped = lowerBound;
    source = 'CLAMPED';
  } else if (rawRate.greaterThan(upperBound)) {
    clamped = upperBound;
    source = 'CLAMPED';
  }

  return {
    ratePerMinute: round6(clamped).toNumber(),
    rawRatePerMinute: round6(rawRate).toNumber(),
    source,
  };
};
