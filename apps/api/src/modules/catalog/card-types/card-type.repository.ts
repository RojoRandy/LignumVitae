import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const withTemplate = { supplyTemplate: { include: { supply: { include: { type: true, unit: true } }, unit: true } } } satisfies Prisma.CardTypeInclude;

@Injectable()
export class CardTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.CardTypeFindManyArgs) {
    return this.prisma.cardType.findMany({ include: withTemplate, ...args });
  }

  count(where: Prisma.CardTypeWhereInput) {
    return this.prisma.cardType.count({ where });
  }

  findById(id: number) {
    return this.prisma.cardType.findUnique({ where: { id }, include: withTemplate });
  }

  create(data: Prisma.CardTypeCreateInput) {
    return this.prisma.cardType.create({ data, include: withTemplate });
  }

  update(id: number, data: Prisma.CardTypeUpdateInput) {
    return this.prisma.cardType.update({ where: { id }, data, include: withTemplate });
  }

  deactivate(id: number) {
    return this.prisma.cardType.update({ where: { id }, data: { isActive: false } });
  }

  countDependents(id: number) {
    return this.prisma.product.count({ where: { cardTypeId: id, isActive: true } });
  }

  replaceTemplate(id: number, items: Prisma.CardSupplyTemplateCreateManyInput[]) {
    return this.prisma.$transaction([
      this.prisma.cardSupplyTemplate.deleteMany({ where: { cardTypeId: id } }),
      this.prisma.cardSupplyTemplate.createMany({ data: items.map((i) => ({ ...i, cardTypeId: id })) }),
    ]);
  }
}
