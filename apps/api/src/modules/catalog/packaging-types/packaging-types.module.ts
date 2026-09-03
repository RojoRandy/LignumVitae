import { Module } from '@nestjs/common';
import { PackagingTypesController } from './packaging-types.controller';
import { PackagingTypesService } from './packaging-types.service';
import { PackagingTypeRepository } from './packaging-type.repository';

@Module({
  controllers: [PackagingTypesController],
  providers: [PackagingTypesService, PackagingTypeRepository],
  exports: [PackagingTypeRepository],
})
export class PackagingTypesModule {}
