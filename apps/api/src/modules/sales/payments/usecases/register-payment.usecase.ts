// Registra un abono. paidAmount SIEMPRE se recalcula con un SUM fresco de
// pagos activos (nunca por incrementos): asi cancelar un pago despues
// nunca deja el saldo desincronizado. Unico gancho automatico de todo el
// ciclo de vida del pedido: si el saldo cubre el anticipo mientras el
// pedido esta PENDING_DEPOSIT, pasa a CONFIRMED solo.
import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderRepository, type OrderWithRelations } from '../../orders/order.repository';
import { PaymentRepository } from '../payment.repository';
import { SettingsService } from '../../../settings/settings.service';
import { FolioService } from '../../../../common/folio/folio.service';
import { SalesErrors } from '../../../../common/errors/sales.errors';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import { RegisterPaymentDto } from '../dto/register-payment.dto';

export interface RegisterPaymentArgs {
  orderId: number;
  dto: RegisterPaymentDto;
  userId?: number;
}

@Injectable()
export class RegisterPaymentUseCase implements UseCase<RegisterPaymentArgs, OrderWithRelations> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly settingsService: SettingsService,
    private readonly folioService: FolioService,
  ) {}

  async execute({ orderId, dto, userId }: RegisterPaymentArgs): Promise<OrderWithRelations> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw SalesErrors.Exceptions.ORDER_NOT_FOUND({ id: orderId });
    if (order.status === 'CANCELLED') throw new BadRequestException('No se pueden registrar abonos en un pedido cancelado');

    const balance = order.total.minus(order.paidAmount);
    if (dto.amount > balance.toNumber()) {
      throw SalesErrors.Exceptions.PAYMENT_EXCEEDS_BALANCE({ orderId, amount: dto.amount, balance: balance.toNumber() });
    }

    const settings = await this.settingsService.get();
    const paidAt = new Date(dto.paidAt);
    const year = paidAt.getUTCFullYear();

    await this.paymentRepository.runInTransaction(async (tx) => {
      const folio = await this.folioService.next('payment', settings.paymentFolioPrefix, year, tx);

      await tx.payment.create({
        data: {
          folio,
          orderId,
          amount: dto.amount,
          method: dto.method,
          isDeposit: dto.isDeposit ?? false,
          reference: dto.reference,
          paidAt,
          notes: dto.notes,
          receivedById: userId,
        },
      });

      const newPaidAmount = await this.paymentRepository.sumActiveByOrder(orderId, tx);

      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount: newPaidAmount,
          ...(order.status === 'PENDING_DEPOSIT' && newPaidAmount.gte(order.depositAmount) ? { status: 'CONFIRMED' as const } : {}),
        },
      });
    });

    return (await this.orderRepository.findById(orderId))!;
  }
}
