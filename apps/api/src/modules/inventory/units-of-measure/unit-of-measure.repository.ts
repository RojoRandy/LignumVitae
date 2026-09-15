import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UnitOfMeasureRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.UnitOfMeasureFindManyArgs) {
    return this.prisma.unitOfMeasure.findMany(args);
  }

  count(where: Prisma.UnitOfMeasureWhereInput) {
    return this.prisma.unitOfMeasure.count({ where });
  }

  findById(id: number) {
    return this.prisma.unitOfMeasure.findUnique({ where: { id } });
  }

  create(data: Prisma.UnitOfMeasureCreateInput) {
    return this.prisma.unitOfMeasure.create({ data });
  }

  update(id: number, data: Prisma.UnitOfMeasureUpdateInput) {
    return this.prisma.unitOfMeasure.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.unitOfMeasure.update({ where: { id }, data: { isActive: false } });
  }

  countDependents(id: number) {
    return this.prisma.supply.count({ where: { unitId: id, isActive: true } });
  }
}
