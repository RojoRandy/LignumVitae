import { Module } from '@nestjs/common';
import { SupplyTypesController } from './supply-types.controller';
import { SupplyTypesService } from './supply-types.service';
import { SupplyTypeRepository } from './supply-type.repository';

@Module({
  controllers: [SupplyTypesController],
  providers: [SupplyTypesService, SupplyTypeRepository],
  exports: [SupplyTypeRepository],
})
export class SupplyTypesModule {}
