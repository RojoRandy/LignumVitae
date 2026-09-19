import { Module } from '@nestjs/common';
import { SettingsModule } from '../../settings/settings.module';
import { QuoteRequestsService } from './quote-requests.service';
import { QuoteRequestRepository } from './quote-request.repository';
import { QuoteRequestsController } from './quote-requests.controller';

@Module({
  imports: [SettingsModule],
  controllers: [QuoteRequestsController],
  providers: [QuoteRequestsService, QuoteRequestRepository],
  exports: [QuoteRequestsService, QuoteRequestRepository],
})
export class QuoteRequestsModule {}
