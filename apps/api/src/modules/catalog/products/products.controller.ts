import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { ProductsService } from './products.service';
import { ProductRepository } from './product.repository';
import { PdfService } from '../../pdf/pdf.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateProductDto, SetPriceOverrideDto, UpdateProductDto } from './dto/create-product.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { PreviewProductCostDto } from './dto/preview-product-cost.dto';
import { FindProductsQueryDto } from './dto/find-products.query.dto';
import { PreviewProductCostingUseCase } from './usecases/preview-product-costing.usecase';
import { RecalculateAllProductsUseCase } from './usecases/recalculate-all-products.usecase';

function parseCatalogFilter(ids?: string, candleIds?: string): { ids?: number[]; candleIds?: number[] } {
  if (ids !== undefined && candleIds !== undefined) {
    throw new BadRequestException('Usa ids o candleIds, no ambos');
  }
  const value = ids ?? candleIds;
  if (value === undefined) return {};

  const key = ids !== undefined ? 'ids' : 'candleIds';
  const values = value.split(',').map((id) => Number(id.trim()));
  if (values.length === 0 || values.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new BadRequestException(`${key} invalidos`);
  }
  return { [key]: [...new Set(values)] };
}

@ApiTags('Catalog')
@Auth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly previewProductCostingUseCase: PreviewProductCostingUseCase,
    private readonly recalculateAllProductsUseCase: RecalculateAllProductsUseCase,
    private readonly productRepository: ProductRepository,
    private readonly pdfService: PdfService,
  ) {}

  // Sin @Auth adicional: hereda el @Auth() de la clase (cualquier
  // autenticado). No persiste nada, asi que no necesita rol de admin.
  @Post('preview-cost')
  previewCost(@Body() dto: PreviewProductCostDto) {
    return this.previewProductCostingUseCase.execute(dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post('apply-suggested-prices')
  applySuggestedPrices() {
    return this.productsService.applySuggestedPrices();
  }

  // Recalcula costo y precio sugerido de todo el catalogo a peticion para reparar costos viejos.
  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post('recalculate-all')
  recalculateAll() {
    return this.recalculateAllProductsUseCase.execute();
  }

  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  // Ver quotations.controller.ts: @Res({ passthrough: false }) evita envolver el binario con ApiResponseInterceptor.
  @Get('catalog-pdf')
  async catalogPdf(
    @Res({ passthrough: false }) res: Response,
    @Query('ids') ids?: string,
    @Query('candleIds') candleIds?: string,
  ) {
    const products = await this.productRepository.findForCatalog(parseCatalogFilter(ids, candleIds));
    const buffer = await this.pdfService.renderCatalogPdf(products);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="catalogo-lignum-vitae.pdf"');
    res.send(buffer);
  }

  // Como catalog-pdf: @Res({ passthrough: false }) evita envolver el binario con ApiResponseInterceptor.
  @Get('catalog-images')
  async catalogImages(
    @Res({ passthrough: false }) res: Response,
    @Query('ids') ids?: string,
    @Query('candleIds') candleIds?: string,
  ) {
    const products = await this.productRepository.findForCatalog(parseCatalogFilter(ids, candleIds));
    const buffer = await this.pdfService.renderCatalogImages(products);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogo-lignum-vitae.zip"');
    res.send(buffer);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findById(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  // Declarado antes de @Patch(':id'): aunque Nest/Express no confunden
  // "images/:imageId" (2 segmentos) con ":id" (1 segmento), se deja primero
  // por seguridad, igual que @Delete('images/:imageId') mas abajo.
  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch('images/:imageId')
  updateImageFlags(@Param('imageId', ParseIntPipe) imageId: number, @Body() dto: UpdateProductImageDto) {
    return this.productsService.updateImageFlags(imageId, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post(':id/reapply-templates')
  reapplyTemplates(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.reapplyTemplates(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id/price-override')
  setPriceOverride(@Param('id', ParseIntPipe) id: number, @Body() dto: SetPriceOverrideDto) {
    return this.productsService.setPriceOverride(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deactivate(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id/permanent')
  deletePermanently(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deletePermanently(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('isPrimary') isPrimary?: string,
  ) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw CatalogErrors.Exceptions.INVALID_IMAGE_TYPE();
    }
    return this.productsService.addImage(id, file, isPrimary === 'true');
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete('images/:imageId')
  removeImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.productsService.removeImage(imageId);
  }
}
