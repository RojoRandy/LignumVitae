import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { ProductsService } from './products.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateProductDto, SetPriceOverrideDto, UpdateProductDto } from './dto/create-product.dto';
import { PreviewProductCostDto } from './dto/preview-product-cost.dto';
import { FindProductsQueryDto } from './dto/find-products.query.dto';
import { PreviewProductCostingUseCase } from './usecases/preview-product-costing.usecase';

@ApiTags('Catalog')
@Auth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly previewProductCostingUseCase: PreviewProductCostingUseCase,
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

  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.productsService.findAll(query);
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
