import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpenseRepository } from './expense.repository';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpenseRepository],
  exports: [ExpenseRepository],
})
export class ExpensesModule {}
