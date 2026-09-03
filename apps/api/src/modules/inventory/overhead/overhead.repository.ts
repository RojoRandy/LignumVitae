import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OverheadRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPeriod(year: number, month: number) {
    return this.prisma.overheadPeriod.findUnique({ where: { year_month: { year, month } } });
  }

  findMany() {
    return this.prisma.overheadPeriod.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  }

  /** El cierre mas reciente ya cerrado, cuya tasa usa el costeo de catalogo por defecto. */
  findMostRecentClosed() {
    return this.prisma.overheadPeriod.findFirst({
      where: { closedAt: { not: null } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  upsert(
    year: number,
    month: number,
    data: Omit<Parameters<PrismaService['overheadPeriod']['update']>[0]['data'], 'year' | 'month'>,
  ) {
    return this.prisma.overheadPeriod.upsert({
      where: { year_month: { year, month } },
      create: { year, month, ...data } as Parameters<PrismaService['overheadPeriod']['create']>[0]['data'],
      update: data,
    });
  }

  /** Bolsa de gastos OVERHEAD del mes, incluida la depreciacion ya generada por closePeriod. */
  async sumOverheadExpenses(periodMonth: Date): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      where: { isActive: true, periodMonth, category: { kind: 'OVERHEAD' } },
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  /** Minutos productivos: pedidos ENTREGADOS dentro del mes. */
  async sumProducedLabor(periodStart: Date, periodEnd: Date) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { isActive: true, status: 'DELIVERED', deliveredAt: { gte: periodStart, lte: periodEnd } },
      },
      select: { quantity: true, laborMinutesPerUnit: true, waxGramsPerUnit: true },
    });

    return items.reduce(
      (acc, item) => ({
        minutes: acc.minutes + item.laborMinutesPerUnit.toNumber() * item.quantity,
        units: acc.units + item.quantity,
        grams: acc.grams + item.waxGramsPerUnit.toNumber() * item.quantity,
      }),
      { minutes: 0, units: 0, grams: 0 },
    );
  }

  /** Activos vigentes para depreciar: adquiridos antes o durante el mes, no retirados antes de empezar. */
  findAssetsForDepreciation(periodStart: Date, periodEnd: Date) {
    return this.prisma.asset.findMany({
      where: {
        isActive: true,
        acquiredAt: { lte: periodEnd },
        OR: [{ retiredAt: null }, { retiredAt: { gte: periodStart } }],
      },
    });
  }

  findOrCreateDepreciationCategory() {
    return this.prisma.expenseCategory.upsert({
      where: { name: 'Depreciacion de activos' },
      create: { name: 'Depreciacion de activos', kind: 'OVERHEAD' },
      update: {},
    });
  }

  /** Quita el candado de un periodo ya cerrado. No borra expenseTotal/ratePerMinute: quedan como
   * historial de la ultima vez que se cerro, listos para pisarse en el proximo cierre real. */
  reopen(year: number, month: number) {
    return this.prisma.overheadPeriod.update({
      where: { year_month: { year, month } },
      data: { closedAt: null },
    });
  }

  deactivateExistingDepreciation(periodMonth: Date) {
    return this.prisma.expense.updateMany({
      where: { periodMonth, source: 'DEPRECIATION' },
      data: { isActive: false },
    });
  }

  createDepreciationExpense(categoryId: number, amount: number, periodMonth: Date, assetId: number) {
    return this.prisma.expense.create({
      data: {
        categoryId,
        source: 'DEPRECIATION',
        description: `Depreciacion mensual del activo #${assetId}`,
        amount,
        periodMonth,
        incurredAt: periodMonth,
        refType: 'asset',
        refId: assetId,
      },
    });
  }
}
