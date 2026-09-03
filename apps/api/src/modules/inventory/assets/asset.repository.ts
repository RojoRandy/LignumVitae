import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.AssetFindManyArgs) {
    return this.prisma.asset.findMany(args);
  }

  count(where: Prisma.AssetWhereInput) {
    return this.prisma.asset.count({ where });
  }

  findById(id: number) {
    return this.prisma.asset.findUnique({ where: { id } });
  }

  create(data: Prisma.AssetCreateInput) {
    return this.prisma.asset.create({ data });
  }

  update(id: number, data: Prisma.AssetUpdateInput) {
    return this.prisma.asset.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.asset.update({ where: { id }, data: { isActive: false, retiredAt: new Date() } });
  }

  /** Activos vigentes para el cierre mensual: adquiridos antes del fin del periodo, no retirados antes de su inicio. */
  findActiveDuringPeriod(periodEnd: Date) {
    return this.prisma.asset.findMany({
      where: {
        isActive: true,
        acquiredAt: { lte: periodEnd },
      },
    });
  }
}
