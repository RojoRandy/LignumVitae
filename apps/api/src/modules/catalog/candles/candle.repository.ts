import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CandleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    category: true,
    supplyTemplate: { include: { supply: { include: { type: true, unit: true } }, unit: true } },
    waxSupply: { include: { type: true, unit: true } },
  } satisfies Prisma.CandleInclude;

  findMany(args: Prisma.CandleFindManyArgs) {
    return this.prisma.candle.findMany({ include: this.include, ...args });
  }

  count(where: Prisma.CandleWhereInput) {
    return this.prisma.candle.count({ where });
  }

  findById(id: number) {
    return this.prisma.candle.findUnique({ where: { id }, include: this.include });
  }

  replaceSupplyTemplate(id: number, items: { supplyId: number; quantity: number; unitId: number; note?: string }[]) {
    return this.prisma.$transaction([
      this.prisma.candleSupplyTemplate.deleteMany({ where: { candleId: id } }),
      this.prisma.candleSupplyTemplate.createMany({ data: items.map((i) => ({ ...i, candleId: id })) }),
    ]);
  }

  create(data: Prisma.CandleCreateInput) {
    return this.prisma.candle.create({ data });
  }

  update(id: number, data: Prisma.CandleUpdateInput) {
    return this.prisma.candle.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.candle.update({ where: { id }, data: { isActive: false } });
  }

  countDependents(id: number) {
    return this.prisma.product.count({ where: { candleId: id, isActive: true } });
  }
}
