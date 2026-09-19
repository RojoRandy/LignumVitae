import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { QuotationsModule } from './quotations/quotations.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { QuoteRequestsModule } from './quote-requests/quote-requests.module';
import { TestimonialsModule } from './testimonials/testimonials.module';

@Module({
  imports: [CustomersModule, QuotationsModule, OrdersModule, PaymentsModule, QuoteRequestsModule, TestimonialsModule],
  exports: [CustomersModule, QuotationsModule, OrdersModule, PaymentsModule, QuoteRequestsModule, TestimonialsModule],
})
export class SalesModule {}
