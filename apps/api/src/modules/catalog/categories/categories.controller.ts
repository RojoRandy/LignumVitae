import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('Catalog')
@Auth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findById(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deactivate(id);
  }
}
