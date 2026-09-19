// Catalogo de solo lectura para la landing. Sin @Auth() a proposito; la
// proteccion es que el repositorio solo selecciona campos publicos, mas el
// ThrottlerGuard global.
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SettingsService } from '../settings/settings.service';
import { CatalogErrors } from '../../common/errors/catalog.errors';
import { PublicCatalogRepository } from './public-catalog.repository';
import { toLandingImagesDto, toPublicCatalogDto, toPublicFragranceDto, toPublicProductDto, toPublicTestimonialDto } from './dto/public-catalog.dto';

const HERO_IMAGES_LIMIT = 8;
const GALLERY_IMAGES_LIMIT = 12;
const TESTIMONIALS_LIMIT = 12;

// Todos los GET de este controller son solo lectura y no cuestan nada de
// negocio: se eximen del limite de 120/min. La landing es SSR y llama a
// varios de golpe desde una sola IP (el contenedor), asi que sin esto un
// crawler o una visita normal tumban el sitio con 429. El POST publico de
// solicitudes de cotizacion (public-quote-requests.controller.ts) conserva
// su limite estricto de 5/min, que es el que de verdad protege algo.
@SkipThrottle()
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
    return toPublicProductDto(product);
  }

  @Get('landing-images')
  async getLandingImages() {
    const [hero, gallery] = await Promise.all([
      this.catalogRepository.findHeroImages(HERO_IMAGES_LIMIT),
      this.catalogRepository.findGalleryImages(GALLERY_IMAGES_LIMIT),
    ]);
    return toLandingImagesDto(hero, gallery);
  }

  @Get('fragrances')
  async getFragrances() {
    return toPublicFragranceDto(await this.catalogRepository.findFragrances());
  }

  @Get('testimonials')
  async getTestimonials() {
    return toPublicTestimonialDto(await this.catalogRepository.findTestimonials(TESTIMONIALS_LIMIT));
  }
}
