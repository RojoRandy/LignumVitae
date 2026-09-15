import { Module } from '@nestjs/common';
import { SuppliesModule } from './supplies/supplies.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AssetsModule } from './assets/assets.module';
import { ExpensesModule } from './expenses/expenses.module';
import { OverheadModule } from './overhead/overhead.module';
import { SupplyTypesModule } from './supply-types/supply-types.module';
import { UnitsOfMeasureModule } from './units-of-measure/units-of-measure.module';

@Module({
  imports: [SuppliesModule, PurchasesModule, AssetsModule, ExpensesModule, OverheadModule, SupplyTypesModule, UnitsOfMeasureModule],
  exports: [SuppliesModule, PurchasesModule, AssetsModule, ExpensesModule, OverheadModule, SupplyTypesModule, UnitsOfMeasureModule],
})
export class InventoryModule {}
