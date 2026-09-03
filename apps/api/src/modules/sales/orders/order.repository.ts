import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export const orderInclude = {
  customer: true,
  items: { orderBy: { sortOrder: 'asc' } },
  payments: { where: { isActive: true }, orderBy: { paidAt: 'desc' } },
  quotation: { select: { id: true, folio: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.OrderFindManyArgs): Promise<OrderWithRelations[]> {
    return this.prisma.order.findMany({ include: orderInclude, ...args }) as Promise<OrderWithRelations[]>;
  }

  count(where: Prisma.OrderWhereInput) {
    return this.prisma.order.count({ where });
  }

  findById(id: number): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({ where: { id }, include: orderInclude });
  }

  findByQuotationId(quotationId: number) {
    return this.prisma.order.findUnique({ where: { quotationId } });
  }

  update(id: number, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({ where: { id }, data });
  }
}
