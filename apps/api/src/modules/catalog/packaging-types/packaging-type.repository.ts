import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const withTemplate = { supplyTemplate: { include: { supply: { include: { type: true, unit: true } }, unit: true } } } satisfies Prisma.PackagingTypeInclude;

@Injectable()
export class PackagingTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.PackagingTypeFindManyArgs) {
    return this.prisma.packagingType.findMany({ include: withTemplate, ...args });
  }

  count(where: Prisma.PackagingTypeWhereInput) {
    return this.prisma.packagingType.count({ where });
  }

  findById(id: number) {
    return this.prisma.packagingType.findUnique({ where: { id }, include: withTemplate });
  }

  create(data: Prisma.PackagingTypeCreateInput) {
    return this.prisma.packagingType.create({ data, include: withTemplate });
  }

  update(id: number, data: Prisma.PackagingTypeUpdateInput) {
    return this.prisma.packagingType.update({ where: { id }, data, include: withTemplate });
  }

  deactivate(id: number) {
    return this.prisma.packagingType.update({ where: { id }, data: { isActive: false } });
  }

  countDependents(id: number) {
    return this.prisma.product.count({ where: { packagingTypeId: id, isActive: true } });
  }

  replaceTemplate(id: number, items: Prisma.PackagingSupplyTemplateCreateManyInput[]) {
    return this.prisma.$transaction([
      this.prisma.packagingSupplyTemplate.deleteMany({ where: { packagingTypeId: id } }),
      this.prisma.packagingSupplyTemplate.createMany({ data: items.map((i) => ({ ...i, packagingTypeId: id })) }),
    ]);
  }
}
