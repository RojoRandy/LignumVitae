// Lecturas del catalogo para la landing. Todo va con `select` explicito: el
// Product real carga costos, margenes e insumos que jamas deben salir por un
// endpoint sin sesion. Si agregas un campo aqui, revisa que sea publico.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const visible = { isActive: true, isVisibleOnLanding: true } as const;
// Igual que `visible`, pero para un producto: ademas exige que su categoria
// tambien este visible. Un producto marcado nunca se cuela por una categoria
// dada de baja.
const visibleProduct = { ...visible, category: visible } as const;

// Primaria primero, luego por sortOrder: el [0] es la portada.
const imageOrder: Prisma.ProductImageOrderByWithRelationInput[] = [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }];

export const publicCatalogSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  colorHex: true,
  coverImageUrl: true,
  products: {
    where: visible,
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      description: true,
      isFeatured: true,
      allowsFragrance: true,
      images: { orderBy: imageOrder, take: 1, select: { url: true, alt: true } },
      // El molde de un producto: SIMPLE lo trae directo, BOUQUET lo arma desde
      // sus componentes. Ver products.service.ts:40 para la misma semantica
      // en el admin.
      candle: { select: { name: true, slug: true } },
      components: { select: { candle: { select: { name: true, slug: true } } } },
    },
  },
} satisfies Prisma.CandleCategorySelect;

// `supplies` se pide SOLO para derivar quoteFields en el mapper (etiqueta y
// placeholder de los insumos marcados "Indicar en cotizacion"): nunca traer
// costos ni existencias, y nunca devolver el BOM crudo.
export const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  kind: true,
  description: true,
  allowsFragrance: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: imageOrder, select: { url: true, alt: true } },
  supplies: { select: { supply: { select: { id: true, askInQuote: true, quoteFieldLabel: true, quoteFieldPlaceholder: true } } } },
} satisfies Prisma.ProductSelect;

export type PublicCatalogCategory = Prisma.CandleCategoryGetPayload<{ select: typeof publicCatalogSelect }>;
export type PublicProduct = Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>;

// Fotos de producto marcadas para publicarse en la portada. Filtradas por el
// mismo `visibleProduct` del catalogo: una foto marcada de un producto dado
// de baja no debe seguir en el hero.
const landingImageSelect = {
  url: true,
  alt: true,
  product: { select: { name: true, slug: true } },
} satisfies Prisma.ProductImageSelect;
export type LandingImage = Prisma.ProductImageGetPayload<{ select: typeof landingImageSelect }>;

// Lista blanca minima: Supply carga currentUnitCost y stockQty, que jamas
// deben salir por un endpoint sin sesion.
const fragranceSelect = { id: true, name: true } satisfies Prisma.SupplySelect;
export type PublicFragrance = Prisma.SupplyGetPayload<{ select: typeof fragranceSelect }>;

const testimonialSelect = { id: true, customerName: true, imageUrl: true, alt: true } satisfies Prisma.TestimonialSelect;
export type PublicTestimonial = Prisma.TestimonialGetPayload<{ select: typeof testimonialSelect }>;

@Injectable()
export class PublicCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCatalog(): Promise<PublicCatalogCategory[]> {
    return this.prisma.candleCategory.findMany({
      where: visible,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: publicCatalogSelect,
    });
  }

  findProductBySlug(slug: string): Promise<PublicProduct | null> {
    return this.prisma.product.findFirst({
      where: { slug, ...visibleProduct },
      select: publicProductSelect,
    });
  }

  findHeroImages(take: number): Promise<LandingImage[]> {
    return this.prisma.productImage.findMany({
      where: { showInHero: true, product: visibleProduct },
      orderBy: [{ product: { isFeatured: 'desc' } }, { product: { name: 'asc' } }, { sortOrder: 'asc' }, { id: 'asc' }],
      take,
      select: landingImageSelect,
    });
  }

  findGalleryImages(take: number): Promise<LandingImage[]> {
    return this.prisma.productImage.findMany({
      where: { showInGallery: true, product: visibleProduct },
      orderBy: [{ product: { isFeatured: 'desc' } }, { product: { name: 'asc' } }, { sortOrder: 'asc' }, { id: 'asc' }],
      take,
      select: landingImageSelect,
    });
  }

  findFragrances(): Promise<PublicFragrance[]> {
    return this.prisma.supply.findMany({
      where: { isFragrance: true, isActive: true },
      orderBy: { name: 'asc' },
      select: fragranceSelect,
    });
  }

  findTestimonials(take: number): Promise<PublicTestimonial[]> {
    return this.prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
      take,
      select: testimonialSelect,
    });
  }
}
