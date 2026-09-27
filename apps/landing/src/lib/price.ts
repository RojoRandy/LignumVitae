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
  return thresholdQty && thresholdQty > 1 ? `Mayoreo a partir de ${thresholdQty} piezas.` : '';
}
