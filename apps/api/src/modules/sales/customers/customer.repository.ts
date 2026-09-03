import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Pedidos "abiertos": todo lo que no sea entrega ya hecha o cancelacion. */
const ACTIVE_ORDER_STATUSES: Prisma.OrderWhereInput['status'] = { notIn: ['DELIVERED', 'CANCELLED'] };

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.CustomerFindManyArgs) {
    return this.prisma.customer.findMany(args);
  }

  count(where: Prisma.CustomerWhereInput) {
    return this.prisma.customer.count({ where });
  }

  findById(id: number) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  create(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({ data });
  }

  update(id: number, data: Prisma.CustomerUpdateInput) {
    return this.prisma.customer.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.customer.update({ where: { id }, data: { isActive: false } });
  }

  countActiveOrders(customerId: number) {
    return this.prisma.order.count({ where: { customerId, isActive: true, status: ACTIVE_ORDER_STATUSES } });
  }

  async findActiveOrderFolios(customerId: number, take = 5): Promise<string[]> {
    const orders = await this.prisma.order.findMany({
      where: { customerId, isActive: true, status: ACTIVE_ORDER_STATUSES },
      select: { folio: true },
      take,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => o.folio);
  }
}
