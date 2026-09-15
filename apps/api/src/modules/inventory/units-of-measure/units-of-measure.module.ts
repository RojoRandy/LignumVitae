import { Module } from '@nestjs/common';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { UnitOfMeasureRepository } from './unit-of-measure.repository';

@Module({
  controllers: [UnitsOfMeasureController],
  providers: [UnitsOfMeasureService, UnitOfMeasureRepository],
  exports: [UnitOfMeasureRepository],
})
export class UnitsOfMeasureModule {}
