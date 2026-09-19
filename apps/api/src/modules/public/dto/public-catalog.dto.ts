// Forma publica del catalogo. El `select` del repositorio ya es lista blanca;
// esto solo aplana la imagen de portada y omite categorias vacias.
import type { PublicCatalogCategory, PublicProduct, LandingImage, PublicFragrance, PublicTestimonial } from '../public-catalog.repository';

export const toPublicCatalogDto = (categories: PublicCatalogCategory[]) =>
  categories
    .filter((category) => category.products.length > 0)
    .map(({ products, ...category }) => ({
      ...category,
      products: products.map(({ images, candle, components, ...product }) => ({
        ...product,
        image: images[0] ?? null,
        // Un ramo (BOUQUET) no tiene `candle` propio: sus moldes vienen de
        // sus componentes. Misma forma de arreglo para ambos casos.
        candles: candle ? [candle] : components.map((c) => c.candle),
      })),
    }));

// Frontera de seguridad del detalle de producto: el select trae `supplies`
// SOLO para derivar quoteFields. El BOM crudo nunca debe salir de aqui.
export const toPublicProductDto = (product: PublicProduct) => {
  const { supplies, ...rest } = product;
  const quoteFields = new Map<number, { supplyId: number; label: string; placeholder: string | null }>();
  for (const { supply } of supplies) {
    if (supply.askInQuote && supply.quoteFieldLabel) {
      quoteFields.set(supply.id, { supplyId: supply.id, label: supply.quoteFieldLabel, placeholder: supply.quoteFieldPlaceholder });
    }
  }
  return { ...rest, quoteFields: [...quoteFields.values()] };
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
