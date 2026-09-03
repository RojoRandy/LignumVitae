import { Module } from '@nestjs/common';
import { CardTypesController } from './card-types.controller';
import { CardTypesService } from './card-types.service';
import { CardTypeRepository } from './card-type.repository';

@Module({
  controllers: [CardTypesController],
  providers: [CardTypesService, CardTypeRepository],
  exports: [CardTypeRepository],
})
export class CardTypesModule {}
