import { Module } from '@nestjs/common';
import { SuppliesModule } from './supplies/supplies.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AssetsModule } from './assets/assets.module';
import { ExpensesModule } from './expenses/expenses.module';
import { OverheadModule } from './overhead/overhead.module';

@Module({
  imports: [SuppliesModule, PurchasesModule, AssetsModule, ExpensesModule, OverheadModule],
  exports: [SuppliesModule, PurchasesModule, AssetsModule, ExpensesModule, OverheadModule],
})
export class InventoryModule {}
