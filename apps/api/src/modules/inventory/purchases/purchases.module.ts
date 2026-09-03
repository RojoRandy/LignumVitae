import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseRepository } from './purchase.repository';
import { SuppliesModule } from '../supplies/supplies.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [SuppliesModule, SettingsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PurchaseRepository],
  exports: [PurchaseRepository],
})
export class PurchasesModule {}
