// Catalogo de solo lectura para la landing. Sin @Auth() a proposito; la
// proteccion es que el repositorio solo selecciona campos publicos, mas el
// ThrottlerGuard global.
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from '../settings/settings.service';
import { CatalogErrors } from '../../common/errors/catalog.errors';
import { PublicCatalogRepository } from './public-catalog.repository';
import { toPublicCatalogDto } from './dto/public-catalog.dto';

@ApiTags('Public')
@Controller('public')
export class PublicCatalogController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly catalogRepository: PublicCatalogRepository,
  ) {}

  @Get('settings')
  getSettings() {
    return this.settingsService.getPublic();
  }

  @Get('catalog')
  async getCatalog() {
    return toPublicCatalogDto(await this.catalogRepository.findCatalog());
  }

  @Get('products/:slug')
  async getProduct(@Param('slug') slug: string) {
    const product = await this.catalogRepository.findProductBySlug(slug);
    if (!product) throw CatalogErrors.Exceptions.PRODUCT_NOT_FOUND();
    return product;
  }
}
