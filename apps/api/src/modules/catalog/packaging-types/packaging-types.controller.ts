import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { PackagingTypesService } from './packaging-types.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreatePackagingTypeDto, UpdatePackagingTypeDto } from './dto/create-packaging-type.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('Catalog')
@Auth()
@Controller('packaging-types')
export class PackagingTypesController {
  constructor(private readonly service: PackagingTypesService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post()
  create(@Body() dto: CreatePackagingTypeDto) {
    return this.service.create(dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePackagingTypeDto) {
    return this.service.update(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
