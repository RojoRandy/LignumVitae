import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './order.repository';
import { CreateOrderFromQuotationUseCase } from './usecases/create-order-from-quotation.usecase';
import { QuotationsModule } from '../quotations/quotations.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [QuotationsModule, SettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, CreateOrderFromQuotationUseCase],
  exports: [OrderRepository, OrdersService],
})
export class OrdersModule {}
