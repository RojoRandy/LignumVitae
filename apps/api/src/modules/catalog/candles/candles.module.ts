import { Module } from '@nestjs/common';
import { CandlesController } from './candles.controller';
import { CandlesService } from './candles.service';
import { CandleRepository } from './candle.repository';

@Module({
  controllers: [CandlesController],
  providers: [CandlesService, CandleRepository],
  exports: [CandleRepository],
})
export class CandlesModule {}
