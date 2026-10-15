import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './order.repository';
import { CreateOrderFromQuotationUseCase } from './usecases/create-order-from-quotation.usecase';
import { AddOrderItemsUseCase } from './usecases/add-order-items.usecase';
import { QuotationsModule } from '../quotations/quotations.module';
import { SuppliesModule } from '../../inventory/supplies/supplies.module';
import { SettingsModule } from '../../settings/settings.module';
import { ProductsModule } from '../../catalog/products/products.module';

@Module({
  imports: [QuotationsModule, SettingsModule, SuppliesModule, ProductsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, CreateOrderFromQuotationUseCase, AddOrderItemsUseCase],
  exports: [OrderRepository, OrdersService],
})
export class OrdersModule {}
