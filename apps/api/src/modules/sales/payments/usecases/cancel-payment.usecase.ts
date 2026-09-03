// Cancelar un pago es baja logica (isActive:false), nunca DELETE fisico --
// mismo idioma que el resto de la app. NO revierte un status CONFIRMED que
// ya se haya aplicado por el gancho automatico (asimetria intencional,
// igual que el equivalente en el proyecto de referencia): revertir status
// automaticamente al cancelar un pago viejo podria "descofirmar" un pedido
// que ya lleva dias en produccion.
import { Injectable } from '@nestjs/common';
import { OrderRepository, type OrderWithRelations } from '../../orders/order.repository';
import { PaymentRepository } from '../payment.repository';
import { SalesErrors } from '../../../../common/errors/sales.errors';
import { UseCase } from '../../../../common/interfaces/use-case.interface';

export interface CancelPaymentArgs {
  paymentId: number;
}

@Injectable()
export class CancelPaymentUseCase implements UseCase<CancelPaymentArgs, OrderWithRelations> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute({ paymentId }: CancelPaymentArgs): Promise<OrderWithRelations> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) throw SalesErrors.Exceptions.PAYMENT_NOT_FOUND({ id: paymentId });

    await this.paymentRepository.runInTransaction(async (tx) => {
      await tx.payment.update({ where: { id: paymentId }, data: { isActive: false } });
      const newPaidAmount = await this.paymentRepository.sumActiveByOrder(payment.orderId, tx);
      await tx.order.update({ where: { id: payment.orderId }, data: { paidAmount: newPaidAmount } });
    });

    return (await this.orderRepository.findById(payment.orderId))!;
  }
}
