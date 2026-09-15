import { Injectable } from '@nestjs/common';
import { Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SupplyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.SupplyFindManyArgs) {
    return this.prisma.supply.findMany({ ...args, include: { type: true, unit: true } });
  }

  count(where: Prisma.SupplyWhereInput) {
    return this.prisma.supply.count({ where });
  }

  findById(id: number) {
    return this.prisma.supply.findUnique({ where: { id }, include: { type: true, unit: true } });
  }

  findByName(name: string) {
    return this.prisma.supply.findUnique({ where: { name }, include: { type: true, unit: true } });
  }

  create(data: Prisma.SupplyCreateInput) {
    return this.prisma.supply.create({ data, include: { type: true, unit: true } });
  }

  update(id: number, data: Prisma.SupplyUpdateInput) {
    return this.prisma.supply.update({ where: { id }, data, include: { type: true, unit: true } });
  }

  deactivate(id: number) {
    return this.prisma.supply.update({ where: { id }, data: { isActive: false }, include: { type: true, unit: true } });
  }

  countProductSupplies(id: number) {
    return this.prisma.productSupply.count({ where: { supplyId: id } });
  }

  /** Recalcula stockQty SIEMPRE desde SUM(movements), nunca por deltas. */
  async recalculateStock(supplyId: number, tx: Prisma.TransactionClient = this.prisma) {
    const result = await tx.stockMovement.aggregate({
      where: { supplyId, isActive: true },
      _sum: { quantity: true },
    });
    return tx.supply.update({
      where: { id: supplyId },
      data: { stockQty: result._sum.quantity ?? 0 },
      include: { type: true, unit: true },
    });
  }

  /**
   * Insumos cuya existencia ya cayo al minimo o por debajo. Prisma no puede
   * comparar dos columnas de la misma tabla en un `where`, asi que va con
   * SQL crudo en vez de traer todo el catalogo a JS a filtrar.
   */
  findLowStock() {
    return this.prisma.$queryRaw<
      Array<{ id: number; name: string; stock_qty: Prisma.Decimal; min_stock_qty: Prisma.Decimal; unit: Pick<UnitOfMeasure, 'id' | 'slug' | 'name' | 'abbr' | 'sortOrder' | 'isSystem' | 'isActive'> }>
    >`SELECT s.id, s.name, s.stock_qty, s.min_stock_qty,
        json_build_object('id', u.id, 'slug', u.slug, 'name', u.name, 'abbr', u.abbr,
          'sortOrder', u.sort_order, 'isSystem', u.is_system, 'isActive', u.is_active) AS unit
      FROM inventory.supplies s
      JOIN inventory.units_of_measure u ON u.id = s.unit_id
      WHERE s.is_active = true AND s.stock_qty <= s.min_stock_qty
      ORDER BY (s.stock_qty - s.min_stock_qty) ASC`;
  }

  /** Compras recientes de este insumo, para alimentar suggestSupplyUnitCost. */
  async recentPurchaseSamples(supplyId: number, sinceDate: Date, maxSamples: number) {
    const items = await this.prisma.purchaseItem.findMany({
      where: {
        supplyId,
        kind: 'SUPPLY',
        purchase: { isActive: true, purchasedAt: { gte: sinceDate } },
      },
      orderBy: { purchase: { purchasedAt: 'desc' } },
      take: maxSamples,
      include: { purchase: { select: { purchasedAt: true } } },
    });
    return items.map((i) => ({
      purchasedAt: i.purchase.purchasedAt.toISOString(),
      baseQuantity: i.baseQuantity.toNumber(),
      landedTotal: i.lineTotal.plus(i.allocatedShipping).toNumber(),
    }));
  }
}
