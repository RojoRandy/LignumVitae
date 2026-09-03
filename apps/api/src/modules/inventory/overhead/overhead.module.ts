import { Module, forwardRef } from '@nestjs/common';
import { OverheadController } from './overhead.controller';
import { OverheadRepository } from './overhead.repository';
import { CloseOverheadPeriodUseCase } from './usecases/close-overhead-period.usecase';
import { ReopenOverheadPeriodUseCase } from './usecases/reopen-overhead-period.usecase';
import { SettingsModule } from '../../settings/settings.module';
import { ProductsModule } from '../../catalog/products/products.module';

@Module({
  // ProductsModule via forwardRef: cerrar o reabrir un mes cambia la tasa de
  // gastos indirectos de TODO el catalogo, asi que ambos use cases disparan
  // RecalculateAllProductsUseCase (ver products.module.ts).
  imports: [SettingsModule, forwardRef(() => ProductsModule)],
  controllers: [OverheadController],
  providers: [OverheadRepository, CloseOverheadPeriodUseCase, ReopenOverheadPeriodUseCase],
  exports: [OverheadRepository],
})
export class OverheadModule {}
