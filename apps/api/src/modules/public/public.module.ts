import { Module } from '@nestjs/common';
import { PublicQuotationsController } from './public-quotations.controller';
import { QuotationsModule } from '../sales/quotations/quotations.module';
import { OrdersModule } from '../sales/orders/orders.module';
import { SettingsModule } from '../settings/settings.module';
import { QuoteRequestsModule } from '../sales/quote-requests/quote-requests.module';
import { PublicQuoteRequestsController } from './public-quote-requests.controller';
import { PublicCatalogController } from './public-catalog.controller';
import { PublicCatalogRepository } from './public-catalog.repository';

@Module({
  imports: [QuotationsModule, OrdersModule, SettingsModule, QuoteRequestsModule],
  controllers: [PublicQuotationsController, PublicCatalogController, PublicQuoteRequestsController],
  providers: [PublicCatalogRepository],
})
export class PublicModule {}
