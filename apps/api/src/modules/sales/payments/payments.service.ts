import { Injectable } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { RegisterPaymentUseCase } from './usecases/register-payment.usecase';
import { CancelPaymentUseCase } from './usecases/cancel-payment.usecase';
import { RegisterPaymentDto } from './dto/register-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly registerPaymentUseCase: RegisterPaymentUseCase,
    private readonly cancelPaymentUseCase: CancelPaymentUseCase,
  ) {}

  findByOrder(orderId: number) {
    return this.paymentRepository.findByOrderId(orderId);
  }

  register(orderId: number, dto: RegisterPaymentDto, userId?: number) {
    return this.registerPaymentUseCase.execute({ orderId, dto, userId });
  }

  cancel(paymentId: number) {
    return this.cancelPaymentUseCase.execute({ paymentId });
  }
}
