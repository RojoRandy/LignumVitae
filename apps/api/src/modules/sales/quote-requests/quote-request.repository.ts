import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class QuoteRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.QuoteRequestFindManyArgs) {
    return this.prisma.quoteRequest.findMany(args);
  }

  count(where: Prisma.QuoteRequestWhereInput) {
    return this.prisma.quoteRequest.count({ where });
  }

  findById(id: number) {
    return this.prisma.quoteRequest.findUnique({ where: { id } });
  }

  /** Solo desde NEW: el `where` compuesto hace la transicion atomica. Devuelve cuantas cambio. */
  async markFromNew(id: number, data: Prisma.QuoteRequestUpdateManyMutationInput, tx: Prisma.TransactionClient = this.prisma) {
    const { count } = await tx.quoteRequest.updateMany({ where: { id, status: 'NEW' }, data });
    return count;
  }

  create(data: Prisma.QuoteRequestCreateInput) {
    return this.prisma.quoteRequest.create({ data, select: { id: true, createdAt: true } });
  }

  /** Productos que la landing puede cotizar: activos, visibles y de categoria visible. */
  findQuotableProducts(ids: number[]) {
    return this.prisma.product.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        isVisibleOnLanding: true,
        category: { isActive: true, isVisibleOnLanding: true },
      },
      select: { id: true, name: true, allowsFragrance: true },
    });
  }

  /** Aromas que la landing puede ofrecer: los mismos que ve el admin al cotizar. */
  findQuotableFragrances(ids: number[]) {
    return this.prisma.supply.findMany({
      where: { id: { in: ids }, isFragrance: true, isActive: true },
      select: { id: true, name: true },
    });
  }
}
