import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  findByOrderId(orderId: number) {
    return this.prisma.payment.findMany({ where: { orderId, isActive: true }, orderBy: { paidAt: 'desc' } });
  }

  /** SIEMPRE la fuente de la verdad de Order.paidAmount: nunca se
   *  incrementa/decrementa por delta, se recalcula fresco cada vez. */
  async sumActiveByOrder(orderId: number, tx: Prisma.TransactionClient = this.prisma) {
    const result = await tx.payment.aggregate({ where: { orderId, isActive: true }, _sum: { amount: true } });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  async sumByMonth(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const result = await this.prisma.payment.aggregate({
      where: { isActive: true, paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }
}
