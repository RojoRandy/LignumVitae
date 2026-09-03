import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { QuotationRepository } from './quotation.repository';
import { QuotationLineCostingService } from './services/quotation-line-costing.service';
import { CreateQuotationUseCase } from './usecases/create-quotation.usecase';
import { DuplicateQuotationUseCase } from './usecases/duplicate-quotation.usecase';
import { PreviewQuotationTotalsUseCase } from './usecases/preview-quotation-totals.usecase';
import { CustomersModule } from '../customers/customers.module';
import { SettingsModule } from '../../settings/settings.module';
import { ProductsModule } from '../../catalog/products/products.module';
import { OverheadModule } from '../../inventory/overhead/overhead.module';
import { SuppliesModule } from '../../inventory/supplies/supplies.module';
import { PdfModule } from '../../pdf/pdf.module';

@Module({
  imports: [CustomersModule, SettingsModule, ProductsModule, OverheadModule, SuppliesModule, PdfModule],
  controllers: [QuotationsController],
  providers: [
    QuotationsService,
    QuotationRepository,
    QuotationLineCostingService,
    CreateQuotationUseCase,
    DuplicateQuotationUseCase,
    PreviewQuotationTotalsUseCase,
  ],
  exports: [QuotationRepository, QuotationsService],
})
export class QuotationsModule {}
