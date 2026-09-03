import { Module } from '@nestjs/common';
import { PublicQuotationsController } from './public-quotations.controller';
import { QuotationsModule } from '../sales/quotations/quotations.module';
import { OrdersModule } from '../sales/orders/orders.module';

@Module({
  imports: [QuotationsModule, OrdersModule],
  controllers: [PublicQuotationsController],
})
export class PublicModule {}
