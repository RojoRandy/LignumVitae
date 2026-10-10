// Forma publica del catalogo. El `select` del repositorio ya es lista blanca;
// esto solo aplana la imagen de portada y omite categorias vacias.
import type { Prisma } from '@prisma/client';
import type { PublicCatalogCategory, PublicProduct, LandingImage, PublicFragrance, PublicTestimonial } from '../public-catalog.repository';

interface PriceFields {
  retailListPrice: Prisma.Decimal;
  wholesaleListPrice: Prisma.Decimal;
  retailPriceOverride: Prisma.Decimal | null;
  wholesalePriceOverride: Prisma.Decimal | null;
}

// Precio efectivo por pieza: el override gana sobre el de lista, igual que al
// cotizar (create-quotation.usecase.ts). Un 0 es un producto sin costear aun:
// sale como null para que la landing no anuncie "$0".
const effectivePrice = (override: Prisma.Decimal | null, list: Prisma.Decimal) => {
  const price = (override ?? list).toNumber();
  return price > 0 ? price : null;
};

export const toPublicPrices = (product: PriceFields) => ({
  retail: effectivePrice(product.retailPriceOverride, product.retailListPrice),
  wholesale: effectivePrice(product.wholesalePriceOverride, product.wholesaleListPrice),
});

interface CandleSize {
  heightCm: Prisma.Decimal | null;
  widthCm: Prisma.Decimal | null;
  grams: Prisma.Decimal;
}

// "4.5 cm de alto · 2.5 cm de ancho · 15 gramos": la misma linea en la landing y en el catalogo PDF.
export const candleDimensions = (candle: CandleSize | null) => (candle ? [
  Number(candle.heightCm) > 0 && `${Number(candle.heightCm)} cm de alto`,
  Number(candle.widthCm) > 0 && `${Number(candle.widthCm)} cm de ancho`,
  Number(candle.grams) > 0 && `${Number(candle.grams)} gramos`,
].filter(Boolean).join(' · ') || null : null);

const omitPriceFields = <T extends PriceFields>(product: T) => {
  const { retailListPrice, wholesaleListPrice, retailPriceOverride, wholesalePriceOverride, ...rest } = product;
  return rest;
};

export const toPublicCatalogDto = (categories: PublicCatalogCategory[]) => {
  const now = new Date();
  return categories
    .filter((category) => category.products.length > 0)
    .map(({ products, ...category }) => ({
      ...category,
      products: products.map(({ images, candle, components, newUntil, ...product }) => ({
        ...omitPriceFields(product),
        prices: toPublicPrices(product),
        isNew: newUntil !== null && newUntil > now,
        image: images[0] ?? null,
        // Un ramo (BOUQUET) no tiene `candle` propio: sus moldes vienen de
        // sus componentes. Misma forma de arreglo para ambos casos.
        candles: candle ? [{ name: candle.name, slug: candle.slug }] : components.map((c) => c.candle),
        // Solo SIMPLE: un ramo mezcla moldes y no tiene una medida unica.
        dimensions: candleDimensions(candle),
      })),
    }));
};

// Frontera de seguridad del detalle de producto: el select trae `supplies`
// SOLO para derivar quoteFields. El BOM crudo nunca debe salir de aqui.
export const toPublicProductDto = (product: PublicProduct) => {
  const { supplies, candle, ...rest } = product;
  const quoteFields = new Map<number, { supplyId: number; label: string; placeholder: string | null }>();
  for (const { supply } of supplies) {
    if (supply.askInQuote && supply.quoteFieldLabel) {
      quoteFields.set(supply.id, { supplyId: supply.id, label: supply.quoteFieldLabel, placeholder: supply.quoteFieldPlaceholder });
    }
  }
  return { ...omitPriceFields(rest), prices: toPublicPrices(rest), quoteFields: [...quoteFields.values()], dimensions: candleDimensions(candle) };
};

export const toLandingImagesDto = (hero: LandingImage[], gallery: LandingImage[]) => ({
  hero: hero.map(toPublicImage),
  gallery: gallery.map(toPublicImage),
});

const toPublicImage = (image: LandingImage) => ({
  url: image.url,
  // `alt` nunca se escribe hoy al subir la imagen (products.service.ts
  // addImage no lo pasa): sin este fallback, todas saldrian sin texto
  // alternativo.
  alt: image.alt ?? image.product.name,
  slug: image.product.slug,
});

export const toPublicFragranceDto = (fragrances: PublicFragrance[]) => fragrances;

export const toPublicTestimonialDto = (testimonials: PublicTestimonial[]) => testimonials;
