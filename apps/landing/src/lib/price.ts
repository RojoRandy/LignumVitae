export interface ProductPrices {
  retail: number | null;
  wholesale: number | null;
}

// Pesos sin centavos cuando el precio es entero ($120), con centavos si no
// ($120.50): la mayoria de los precios se redondean y los ceros sobran.
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export const PRICE_DISCLAIMER = 'Precios por pieza en MXN, sujetos a cambios sin previo aviso.';

export function wholesaleNote(thresholdQty: number | null | undefined): string {
  return thresholdQty && thresholdQty > 1 ? `Mayoreo a partir de ${thresholdQty} piezas por producto.` : '';
}

export function fragranceNote(surcharge: number | null | undefined): string {
  return surcharge && surcharge > 0 ? `Con aroma: ${formatPrice(surcharge)} adicional por pieza.` : '';
}

export interface PriceSettings {
  wholesaleThresholdQty?: number;
  fragranceSurcharge?: number;
}

export type PriceTier = 'retail' | 'wholesale';

export interface LineEstimate {
  tier: PriceTier;
  /** Precio por pieza, aroma incluido. */
  unitPrice: number;
  lineTotal: number;
}

const toCents = (value: number) => Math.round(value * 100);

// Cada producto decide su bracket con SU cantidad (no se suman las piezas de
// toda la cotizacion). Es un estimado: la cotizacion formal la arma el admin.
export function resolveTier(quantity: number, thresholdQty: number | undefined): PriceTier {
  return thresholdQty && thresholdQty > 1 && quantity >= thresholdQty ? 'wholesale' : 'retail';
}

// null = sin precio publicado para ese bracket: el renglon queda "a cotizar".
// Se opera en centavos para que el total cuadre con la suma de renglones.
export function estimateLine(
  item: { quantity: number; withFragrance: boolean },
  prices: ProductPrices | undefined,
  settings: PriceSettings,
): LineEstimate | null {
  const tier = resolveTier(item.quantity, settings.wholesaleThresholdQty);
  const base = prices?.[tier] ?? null;
  if (base === null) return null;
  const unitCents = toCents(base) + (item.withFragrance ? toCents(settings.fragranceSurcharge ?? 0) : 0);
  return { tier, unitPrice: unitCents / 100, lineTotal: (unitCents * item.quantity) / 100 };
}

export function estimateTotal(lines: (LineEstimate | null)[]): { total: number; pending: number } {
  const cents = lines.reduce((acc, line) => acc + (line ? toCents(line.lineTotal) : 0), 0);
  return { total: cents / 100, pending: lines.filter((line) => line === null).length };
}
