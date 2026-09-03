import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { QuotationsModule } from './quotations/quotations.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [CustomersModule, QuotationsModule, OrdersModule, PaymentsModule],
  exports: [CustomersModule, QuotationsModule, OrdersModule, PaymentsModule],
})
export class SalesModule {}
