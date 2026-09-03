import { Module, forwardRef } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductRepository } from './product.repository';
import { RecalculateProductCostingUseCase } from './usecases/recalculate-product-costing.usecase';
import { RecalculateAllProductsUseCase } from './usecases/recalculate-all-products.usecase';
import { PreviewProductCostingUseCase } from './usecases/preview-product-costing.usecase';
import { ProductCostingCalculator } from './services/product-costing-calculator.service';
import { CandlesModule } from '../candles/candles.module';
import { PackagingTypesModule } from '../packaging-types/packaging-types.module';
import { CardTypesModule } from '../card-types/card-types.module';
import { SettingsModule } from '../../settings/settings.module';
import { OverheadModule } from '../../inventory/overhead/overhead.module';
import { SuppliesModule } from '../../inventory/supplies/supplies.module';

@Module({
  // OverheadModule y SuppliesModule ahora tambien importan ProductsModule
  // (para disparar RecalculateAllProductsUseCase cuando cierran un mes o
  // aplican un costo sugerido -- bug D.1 del plan de UX: los precios se
  // quedaban obsoletos en silencio). forwardRef() en los dos lados de cada
  // par de imports es la forma soportada por Nest de resolver el ciclo.
  imports: [
    CandlesModule,
    PackagingTypesModule,
    CardTypesModule,
    SettingsModule,
    forwardRef(() => OverheadModule),
    forwardRef(() => SuppliesModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductRepository, RecalculateProductCostingUseCase, RecalculateAllProductsUseCase, PreviewProductCostingUseCase, ProductCostingCalculator],
  exports: [ProductRepository, RecalculateProductCostingUseCase, RecalculateAllProductsUseCase, ProductCostingCalculator],
})
export class ProductsModule {}
