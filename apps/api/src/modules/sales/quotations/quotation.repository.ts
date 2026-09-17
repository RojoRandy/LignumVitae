import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export const quotationInclude = {
  customer: true,
  items: { include: { product: { select: { id: true, name: true } }, fragranceSupply: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } },
  order: { select: { id: true, folio: true } },
} satisfies Prisma.QuotationInclude;

export type QuotationWithRelations = Prisma.QuotationGetPayload<{ include: typeof quotationInclude }>;

/** Status vivos que aun pueden vencer o convertirse en pedido. */
const OPEN_STATUSES: Prisma.QuotationWhereInput['status'] = { in: ['DRAFT', 'SENT', 'VIEWED'] };

@Injectable()
export class QuotationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.QuotationFindManyArgs): Promise<QuotationWithRelations[]> {
    return this.prisma.quotation.findMany({ include: quotationInclude, ...args }) as Promise<QuotationWithRelations[]>;
  }

  count(where: Prisma.QuotationWhereInput) {
    return this.prisma.quotation.count({ where });
  }

  findById(id: number): Promise<QuotationWithRelations | null> {
    return this.prisma.quotation.findUnique({ where: { id }, include: quotationInclude });
  }

  findByPublicToken(publicToken: string): Promise<QuotationWithRelations | null> {
    return this.prisma.quotation.findUnique({ where: { publicToken }, include: quotationInclude });
  }

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  update(id: number, data: Prisma.QuotationUpdateInput) {
    return this.prisma.quotation.update({ where: { id }, data });
  }

  /** Vencimiento perezoso: se barre al leer, nunca por cron. Mismo idioma
   *  que ya usa paidAmount ("derivado, nunca dato viejo"). */
  expireOverdue() {
    return this.prisma.quotation.updateMany({
      where: { status: OPEN_STATUSES, validUntil: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }
}
