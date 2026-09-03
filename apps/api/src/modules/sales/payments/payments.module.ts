import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentRepository } from './payment.repository';
import { RegisterPaymentUseCase } from './usecases/register-payment.usecase';
import { CancelPaymentUseCase } from './usecases/cancel-payment.usecase';
import { OrdersModule } from '../orders/orders.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [OrdersModule, SettingsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentRepository, RegisterPaymentUseCase, CancelPaymentUseCase],
  exports: [PaymentRepository, PaymentsService],
})
export class PaymentsModule {}
