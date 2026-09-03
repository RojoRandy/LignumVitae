import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
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
  @Post(':id/images')
  addImage(@Param('id', ParseIntPipe) id: number, @Body() body: { url: string; isPrimary?: boolean }) {
    return this.productsService.addImage(id, body.url, body.isPrimary);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete('images/:imageId')
  removeImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.productsService.removeImage(imageId);
  }
}
