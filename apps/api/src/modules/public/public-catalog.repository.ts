// Lecturas del catalogo para la landing. Todo va con `select` explicito: el
// Product real carga costos, margenes e insumos que jamas deben salir por un
// endpoint sin sesion. Si agregas un campo aqui, revisa que sea publico.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const visible = { isActive: true, isVisibleOnLanding: true } as const;

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
    },
  },
} satisfies Prisma.CandleCategorySelect;

export const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  kind: true,
  description: true,
  allowsFragrance: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: imageOrder, select: { url: true, alt: true } },
} satisfies Prisma.ProductSelect;

export type PublicCatalogCategory = Prisma.CandleCategoryGetPayload<{ select: typeof publicCatalogSelect }>;
export type PublicProduct = Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>;

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
      where: { slug, ...visible, category: visible },
      select: publicProductSelect,
    });
  }
}
