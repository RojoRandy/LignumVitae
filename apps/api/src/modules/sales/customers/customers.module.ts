import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerRepository } from './customer.repository';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerRepository],
  exports: [CustomerRepository, CustomersService],
})
export class CustomersModule {}
