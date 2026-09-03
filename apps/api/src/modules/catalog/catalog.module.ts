import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { CandlesModule } from './candles/candles.module';
import { PackagingTypesModule } from './packaging-types/packaging-types.module';
import { CardTypesModule } from './card-types/card-types.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [CategoriesModule, CandlesModule, PackagingTypesModule, CardTypesModule, ProductsModule],
  exports: [CategoriesModule, CandlesModule, PackagingTypesModule, CardTypesModule, ProductsModule],
})
export class CatalogModule {}
