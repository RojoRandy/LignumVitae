import { Module, forwardRef } from '@nestjs/common';
import { SuppliesController } from './supplies.controller';
import { SuppliesService } from './supplies.service';
import { SupplyRepository } from './supply.repository';
import { SettingsModule } from '../../settings/settings.module';
import { ProductsModule } from '../../catalog/products/products.module';

@Module({
  // ProductsModule via forwardRef: SuppliesService dispara
  // RecalculateAllProductsUseCase al aplicar un costo sugerido, para que los
  // precios de catalogo no se queden obsoletos (ver products.module.ts).
  imports: [SettingsModule, forwardRef(() => ProductsModule)],
  controllers: [SuppliesController],
  providers: [SuppliesService, SupplyRepository],
  exports: [SupplyRepository, SuppliesService],
})
export class SuppliesModule {}
