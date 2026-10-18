import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.PurchaseFindManyArgs) {
    return this.prisma.purchase.findMany({ include: { items: true }, ...args });
  }

  /** Compras activas en [start, end) con sus renglones: el resumen financiero del mes. */
  findActiveBetween(start: Date, end: Date) {
    return this.prisma.purchase.findMany({
      where: { isActive: true, purchasedAt: { gte: start, lt: end } },
      include: { items: true },
      orderBy: { purchasedAt: 'asc' },
    });
  }

  count(where: Prisma.PurchaseWhereInput) {
    return this.prisma.purchase.count({ where });
  }

  findById(id: number) {
    return this.prisma.purchase.findUnique({ where: { id }, include: { items: true } });
  }

  /** Corre toda la compra en una sola transaccion: cabecera + renglones + movimientos de stock. */
  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
