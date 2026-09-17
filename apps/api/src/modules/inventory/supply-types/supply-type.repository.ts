import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SupplyTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.SupplyTypeFindManyArgs) {
    return this.prisma.supplyType.findMany(args);
  }

  count(where: Prisma.SupplyTypeWhereInput) {
    return this.prisma.supplyType.count({ where });
  }

  findById(id: number) {
    return this.prisma.supplyType.findUnique({ where: { id } });
  }

  create(data: Prisma.SupplyTypeCreateInput) {
    return this.prisma.supplyType.create({ data });
  }

  update(id: number, data: Prisma.SupplyTypeUpdateInput) {
    return this.prisma.supplyType.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.supplyType.update({ where: { id }, data: { isActive: false } });
  }

  countDependents(id: number) {
    return this.prisma.supply.count({ where: { typeId: id, isActive: true } });
  }
}
