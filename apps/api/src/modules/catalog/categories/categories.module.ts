import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './category.repository';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryRepository],
  exports: [CategoryRepository],
})
export class CategoriesModule {}
