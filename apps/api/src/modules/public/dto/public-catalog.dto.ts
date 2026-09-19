// Forma publica del catalogo. El `select` del repositorio ya es lista blanca;
// esto solo aplana la imagen de portada y omite categorias vacias.
import type { PublicCatalogCategory, PublicProduct, LandingImage, PublicFragrance, PublicTestimonial } from '../public-catalog.repository';

// Tipos de insumo que, si el producto los lleva en su BOM, habilitan el
// campo correspondiente en el detalle publico. Depender del slug (no del id)
// es la misma decision que Settings.waxSupplyTypeId documenta como riesgosa
// (schema.prisma:1160): renombrar el tipo esconde el campo en la landing, en
// silencio. Aceptable aqui porque lo que se rompe es un campo de formulario,
// no dinero, y se nota de inmediato.
// ponytail: slugs fijos en una constante; mover a Settings si molesta.
const DYE_SLUG = 'DYE';
const RIBBON_SLUG = 'RIBBON';

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
// (con el tipo de insumo) SOLO para derivar estos dos booleanos. El BOM
// crudo nunca debe salir de aqui.
export const toPublicProductDto = (product: PublicProduct) => {
  const supplyTypeSlugs = new Set(product.supplies.map((s) => s.supply.type.slug));
  const { supplies: _supplies, ...rest } = product;
  return {
    ...rest,
    allowsCandleColor: supplyTypeSlugs.has(DYE_SLUG),
    allowsRibbonColor: supplyTypeSlugs.has(RIBBON_SLUG),
  };
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
