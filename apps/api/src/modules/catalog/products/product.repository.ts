import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export const productInclude = {
  category: true,
  candle: {
    include: { category: true, supplyTemplate: { include: { supply: { include: { type: true, unit: true } }, unit: true } }, waxSupply: { include: { type: true, unit: true } } },
  },
  packagingType: { include: { supplyTemplate: { include: { supply: { include: { type: true, unit: true } }, unit: true } } } },
  cardType: { include: { supplyTemplate: { include: { supply: { include: { type: true, unit: true } }, unit: true } } } },
  supplies: { include: { supply: { include: { type: true, unit: true } }, unit: true } },
  components: { include: { candle: { include: { waxSupply: { include: { type: true, unit: true } }, supplyTemplate: { include: { supply: { include: { type: true, unit: true } }, unit: true } } } } }, orderBy: { sortOrder: 'asc' } },
  images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.ProductFindManyArgs) {
    return this.prisma.product.findMany({ include: productInclude, ...args });
  }

  count(where: Prisma.ProductWhereInput) {
    return this.prisma.product.count({ where });
  }

  findById(id: number): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({ where: { id }, include: productInclude });
  }

  findBySlug(slug: string): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({ where: { slug }, include: productInclude });
  }

  findBySku(sku: string) {
    return this.prisma.product.findUnique({ where: { sku } });
  }

  findExistingCombination(candleId: number, packagingTypeId: number | null, cardTypeId: number | null) {
    return this.prisma.product.findFirst({
      where: { candleId, packagingTypeId, cardTypeId, isActive: true },
    });
  }

  create(data: Prisma.ProductCreateInput): Promise<ProductWithRelations> {
    return this.prisma.product.create({ data, include: productInclude });
  }

  update(id: number, data: Prisma.ProductUpdateInput): Promise<ProductWithRelations> {
    return this.prisma.product.update({ where: { id }, data, include: productInclude });
  }

  deactivate(id: number) {
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async countDependents(id: number) {
    const [quotationItemsCount, orderItemsCount] = await Promise.all([
      this.prisma.quotationItem.count({ where: { productId: id } }),
      this.prisma.orderItem.count({ where: { productId: id } }),
    ]);
    return { quotationItemsCount, orderItemsCount };
  }

  deletePermanently(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }

  replaceSupplies(id: number, items: { supplyId: number; quantity: number; unitId: number; note?: string; source: Prisma.ProductSupplyCreateManyInput['source'] }[]) {
    return this.prisma.$transaction([
      this.prisma.productSupply.deleteMany({ where: { productId: id } }),
      this.prisma.productSupply.createMany({ data: items.map((i) => ({ ...i, productId: id })) }),
    ]);
  }

  replaceComponents(id: number, items: { candleId: number; quantity: number; sortOrder: number }[]) {
    return this.prisma.$transaction([
      this.prisma.productComponent.deleteMany({ where: { productId: id } }),
      this.prisma.productComponent.createMany({ data: items.map((i) => ({ ...i, productId: id })) }),
    ]);
  }

  updateCosting(id: number, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  findManyByIds(ids: number[]): Promise<ProductWithRelations[]> {
    return this.prisma.product.findMany({ where: { id: { in: ids } }, include: productInclude });
  }

  addImage(productId: number, data: { url: string; alt?: string; isPrimary?: boolean; sortOrder?: number }) {
    return this.prisma.productImage.create({ data: { ...data, productId } });
  }

  findImage(imageId: number) {
    return this.prisma.productImage.findUnique({ where: { id: imageId } });
  }

  updateImageFlags(imageId: number, data: { showInHero?: boolean; showInGallery?: boolean }) {
    return this.prisma.productImage.update({ where: { id: imageId }, data });
  }

  clearCategoryCovers(urls: string[]) {
    if (urls.length === 0) return;
    return this.prisma.candleCategory.updateMany({
      where: { coverImageUrl: { in: urls } },
      data: { coverImageUrl: null },
    });
  }

  removeImage(imageId: number) {
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }
}
