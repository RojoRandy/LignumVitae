import { money, round6 } from './money';

// Gotero estandar: 20 gotas = 1 ml.
export const DROPS_PER_ML = 20;

export const estimateFragranceMl = (waxGrams: number, dropsPer100g: number): number => {
  if (!Number.isFinite(waxGrams) || !Number.isFinite(dropsPer100g) || waxGrams < 0 || dropsPer100g < 0) {
    return 0;
  }
  return round6(money(waxGrams).times(dropsPer100g).dividedBy(100).dividedBy(DROPS_PER_ML)).toNumber();
};

export const estimateFragranceDrops = (ml: number): number =>
  money(ml).times(DROPS_PER_ML).toDecimalPlaces(1).toNumber();
