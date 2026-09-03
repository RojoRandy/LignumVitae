import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.CandleCategoryFindManyArgs) {
    return this.prisma.candleCategory.findMany(args);
  }

  count(where: Prisma.CandleCategoryWhereInput) {
    return this.prisma.candleCategory.count({ where });
  }

  findById(id: number) {
    return this.prisma.candleCategory.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.candleCategory.findUnique({ where: { slug } });
  }

  create(data: Prisma.CandleCategoryCreateInput) {
    return this.prisma.candleCategory.create({ data });
  }

  update(id: number, data: Prisma.CandleCategoryUpdateInput) {
    return this.prisma.candleCategory.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.candleCategory.update({ where: { id }, data: { isActive: false } });
  }

  countDependents(id: number) {
    return this.prisma.product.count({ where: { categoryId: id, isActive: true } });
  }
}
