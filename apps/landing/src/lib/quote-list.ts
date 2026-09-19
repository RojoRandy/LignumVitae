// Dato libre de un insumo "Indicar en cotizacion" (ej. Color del liston); el
// label viaja para mostrarlo tal cual sin volver a consultar el catalogo.
export interface QuoteExtraField {
  supplyId: number;
  label: string;
  value: string;
}

export interface QuoteItem {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  quantity: number;
  candleColor: string;
  extraFields: QuoteExtraField[];
  withFragrance: boolean;
  // Vacios cuando no hay aroma, igual que candleColor/extraFields cuando no
  // se capturan: la forma del item no cambia segun sus opciones.
  fragranceId: string;
  fragranceName: string;
}

// v2: agrega fragranceId/fragranceName. v3: ribbonColor -> extraFields. Subir
// la llave (no migrar in situ) vacia los carritos guardados al desplegar,
// aceptable porque la landing aun no se lanza; evita dejar codigo tolerante
// a una forma vieja.
const STORAGE_KEY = 'lv.quote.v3';

const isExtraField = (value: unknown): value is QuoteExtraField => {
  if (!value || typeof value !== 'object') return false;
  const field = value as Record<string, unknown>;
  return Number.isSafeInteger(field.supplyId) && typeof field.label === 'string' && typeof field.value === 'string';
};

function isQuoteItem(value: unknown): value is QuoteItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['productId', 'slug', 'name', 'imageUrl', 'candleColor', 'fragranceId', 'fragranceName']
    .every((key) => typeof item[key] === 'string')
    && Array.isArray(item.extraFields) && item.extraFields.every(isExtraField)
    && typeof item.quantity === 'number' && Number.isSafeInteger(item.quantity)
    && item.quantity >= 1 && typeof item.withFragrance === 'boolean';
}

function load(): QuoteItem[] {
  const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  if (!Array.isArray(value) || !value.every(isQuoteItem)) {
    throw new Error('Lista de cotización inválida');
  }
  return value;
}

export function readQuote(): QuoteItem[] {
  try {
    return load();
  } catch {
    return [];
  }
}

function sameOptions(a: QuoteItem, b: QuoteItem): boolean {
  return a.productId === b.productId && a.candleColor === b.candleColor
    && JSON.stringify(a.extraFields) === JSON.stringify(b.extraFields) && a.withFragrance === b.withFragrance
    && a.fragranceId === b.fragranceId;
}

function merge(items: QuoteItem[], item: QuoteItem): void {
  if (!isQuoteItem(item)) throw new Error('Producto inválido');
  const existing = items.find((entry) => sameOptions(entry, item));
  if (existing) {
    const quantity = existing.quantity + item.quantity;
    if (!Number.isSafeInteger(quantity)) throw new Error('Cantidad inválida');
    existing.quantity = quantity;
  } else {
    items.push({ ...item });
  }
}

function save(items: QuoteItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('quote:change'));
}

// Mutations return false if storage is unavailable or data is invalid; never report a false success.
export function addQuoteItem(item: QuoteItem): boolean {
  try {
    const items = load();
    merge(items, item);
    save(items);
    return true;
  } catch {
    return false;
  }
}

// Index is the item's position in readQuote(). Editing into an existing variant merges quantities.
export function updateQuoteItem(index: number, changes: Partial<Pick<QuoteItem,
  'quantity' | 'candleColor' | 'withFragrance'>>): boolean {
  try {
    const items = load();
    if (!Number.isInteger(index) || !items[index]) return false;
    const item = { ...items[index], ...changes };
    if (!isQuoteItem(item)) return false;
    items[index] = item;
    const merged: QuoteItem[] = [];
    items.forEach((entry) => merge(merged, entry));
    save(merged);
    return true;
  } catch {
    return false;
  }
}

export function removeQuoteItem(index: number): boolean {
  try {
    const items = load();
    if (!Number.isInteger(index) || !items[index]) return false;
    items.splice(index, 1);
    save(items);
    return true;
  } catch {
    return false;
  }
}

export function clearQuote(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('quote:change'));
    return true;
  } catch {
    return false;
  }
}

export function updateQuoteCount(): void {
  const count = readQuote().length;
  document.querySelectorAll<HTMLElement>('[data-quote-count]').forEach((badge) => {
    badge.textContent = String(count);
    const floatingLink = badge.closest('a.quote-float');
    if (floatingLink) {
      badge.hidden = count === 0;
      floatingLink.setAttribute('aria-label', `Mi cotización, ${count} productos`);
    }
  });
}
