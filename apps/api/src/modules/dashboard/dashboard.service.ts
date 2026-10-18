import { Injectable } from '@nestjs/common';
import { money, round2 } from '@lignumvitae/types';
import { QuotationRepository } from '../sales/quotations/quotation.repository';
import { OrderRepository } from '../sales/orders/order.repository';
import { PaymentRepository } from '../sales/payments/payment.repository';
import { PurchaseRepository } from '../inventory/purchases/purchase.repository';
import { ExpenseRepository } from '../inventory/expenses/expense.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly quotationRepository: QuotationRepository,
    private readonly orderRepository: OrderRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly purchaseRepository: PurchaseRepository,
    private readonly expenseRepository: ExpenseRepository,
  ) {}

  /** Pequeno a proposito: no es la fase de reportes, solo lo que el
   *  dashboard general necesita para dejar de decir "se agrega en Fase 3". */
  async getSalesStats() {
    const today = new Date();
    const in14Days = new Date(today);
    in14Days.setDate(in14Days.getDate() + 14);

    const [activeQuotations, pendingOrders, readyOrders, revenueThisMonth, upcomingDeliveries] = await Promise.all([
      this.quotationRepository.count({ status: { in: ['DRAFT', 'SENT', 'VIEWED'] }, isActive: true }),
      this.orderRepository.count({ status: { in: ['PENDING_DEPOSIT', 'CONFIRMED', 'IN_PRODUCTION'] }, isActive: true }),
      this.orderRepository.count({ status: 'READY', isActive: true }),
      this.paymentRepository.sumByMonth(today.getUTCFullYear(), today.getUTCMonth() + 1),
      this.orderRepository.findMany({
        where: { status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY'] }, dueDate: { gte: today, lte: in14Days }, isActive: true },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    return { activeQuotations, pendingOrders, readyOrders, revenueThisMonth, upcomingDeliveries };
  }

  /** A donde se va cada peso que entro en el mes. Cuenta los pedidos
   *  levantados en el mes (orderDate) que no estan cancelados, con el costeo
   *  que cada pedido congelo al crearse. Las partes suman exactamente el
   *  ingreso: total = materiales + mano de obra + indirectos + envio + ganancia,
   *  porque la ganancia se toma como el residuo y no del grossProfit guardado. */
  async getMonthlyFinance(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [orders, payments, purchases, expenses] = await Promise.all([
      this.orderRepository.findForFinance({
        isActive: true,
        status: { not: 'CANCELLED' },
        orderDate: { gte: start, lt: end },
      }),
      this.paymentRepository.sumByMonthByKind(year, month),
      this.purchaseRepository.findActiveBetween(start, end),
      this.expenseRepository.findActiveByPeriod(start),
    ]);

    const rows = orders.map((o) => {
      const materials = money(o.totalCost.toString()).minus(o.totalLaborCost.toString()).minus(o.totalOverheadCost.toString());
      const labor = money(o.totalLaborCost.toString());
      const overhead = money(o.totalOverheadCost.toString());
      const shipping = money(o.shippingCost.toString());
      const total = money(o.total.toString());
      const profit = total.minus(o.totalCost.toString()).minus(shipping);
      return { order: o, total, paid: money(o.paidAmount.toString()), materials, labor, overhead, shipping, profit };
    });

    const sum = (pick: (r: (typeof rows)[number]) => ReturnType<typeof money>) =>
      rows.reduce((acc, r) => acc.plus(pick(r)), money(0));

    const income = sum((r) => r.total);
    const collected = sum((r) => r.paid);
    const materials = sum((r) => r.materials);
    const labor = sum((r) => r.labor);
    const overhead = sum((r) => r.overhead);
    const shipping = sum((r) => r.shipping);
    const profit = sum((r) => r.profit);

    const amount = (value: ReturnType<typeof money>) => round2(value).toFixed(2);

    // --- Egresos. Un renglon EXPENSE de una compra ya genera su Expense (source
    // PURCHASE), y la depreciacion no es dinero que salga: para no contar doble,
    // lo que salio = compras + gastos MANUAL.
    const purchaseLines = (kind: 'SUPPLY' | 'ASSET' | 'EXPENSE') =>
      purchases.reduce(
        (acc, p) => p.items.filter((i) => i.kind === kind).reduce((a, i) => a.plus(i.lineTotal.toString()), acc),
        money(0),
      );
    const purchasesTotal = purchases.reduce((acc, p) => acc.plus(p.total.toString()), money(0));
    const purchasesShipping = purchases.reduce((acc, p) => acc.plus(p.shippingCost.toString()), money(0));

    const expensesBySource = (source: 'MANUAL' | 'PURCHASE' | 'DEPRECIATION') =>
      expenses.filter((e) => e.source === source).reduce((acc, e) => acc.plus(e.amount.toString()), money(0));
    const expensesTotal = expenses.reduce((acc, e) => acc.plus(e.amount.toString()), money(0));
    const manualExpenses = expensesBySource('MANUAL');

    const byCategory = new Map<number, { categoryId: number; name: string; kind: string; amount: ReturnType<typeof money> }>();
    for (const e of expenses) {
      const row = byCategory.get(e.categoryId) ?? { categoryId: e.categoryId, name: e.category.name, kind: e.category.kind, amount: money(0) };
      row.amount = row.amount.plus(e.amount.toString());
      byCategory.set(e.categoryId, row);
    }

    const collectedThisMonth = payments.deposits.amount.plus(payments.installments.amount);
    const outflowsTotal = purchasesTotal.plus(manualExpenses);
    const pct = (value: ReturnType<typeof money>) =>
      income.isZero() ? '0.0' : value.dividedBy(income).times(100).toDecimalPlaces(1).toFixed(1);
    const part = (value: ReturnType<typeof money>) => ({ amount: amount(value), pct: pct(value) });

    return {
      year,
      month,
      orderCount: rows.length,
      income: amount(income),
      collected: amount(collected),
      outstanding: amount(income.minus(collected)),
      // Dinero que de verdad entro en el mes (por fecha de pago), de cualquier pedido.
      payments: {
        total: payments.deposits.amount.plus(payments.installments.amount).toFixed(2),
        deposits: { amount: payments.deposits.amount.toFixed(2), count: payments.deposits.count },
        installments: { amount: payments.installments.amount.toFixed(2), count: payments.installments.count },
      },
      breakdown: {
        materials: part(materials),
        labor: part(labor),
        productionCost: part(materials.plus(labor)),
        overhead: part(overhead),
        shipping: part(shipping),
        expenses: part(overhead.plus(shipping)),
        profit: part(profit),
      },
      outflows: {
        total: amount(outflowsTotal),
        /** Cobrado en el mes menos lo que salio en el mes. */
        net: amount(money(collectedThisMonth.toString()).minus(outflowsTotal)),
      },
      purchases: {
        total: amount(purchasesTotal),
        count: purchases.length,
        supplies: amount(purchaseLines('SUPPLY')),
        assets: amount(purchaseLines('ASSET')),
        expenses: amount(purchaseLines('EXPENSE')),
        shipping: amount(purchasesShipping),
        list: purchases.map((p) => ({
          id: p.id,
          folio: p.folio,
          purchasedAt: p.purchasedAt,
          supplier: p.supplierName || p.platform || null,
          total: amount(money(p.total.toString())),
        })),
      },
      expenses: {
        total: amount(expensesTotal),
        manual: amount(manualExpenses),
        fromPurchases: amount(expensesBySource('PURCHASE')),
        depreciation: amount(expensesBySource('DEPRECIATION')),
        byCategory: [...byCategory.values()]
          .sort((a, b) => b.amount.comparedTo(a.amount))
          .map((c) => ({ ...c, amount: amount(c.amount) })),
      },
      orders: rows.map((r) => ({
        id: r.order.id,
        folio: r.order.folio,
        status: r.order.status,
        orderDate: r.order.orderDate,
        customerName: r.order.customer.fullName,
        total: amount(r.total),
        productionCost: amount(r.materials.plus(r.labor)),
        expenses: amount(r.overhead.plus(r.shipping)),
        profit: amount(r.profit),
      })),
    };
  }
}
