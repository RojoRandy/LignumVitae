import { Injectable } from '@nestjs/common';
import { QuotationRepository } from '../sales/quotations/quotation.repository';
import { OrderRepository } from '../sales/orders/order.repository';
import { PaymentRepository } from '../sales/payments/payment.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly quotationRepository: QuotationRepository,
    private readonly orderRepository: OrderRepository,
    private readonly paymentRepository: PaymentRepository,
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
}
