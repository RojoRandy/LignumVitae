import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { SupplyTypesService } from './supply-types.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateSupplyTypeDto, UpdateSupplyTypeDto } from './dto/create-supply-type.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('Catalog')
@Auth()
@Controller('supply-types')
export class SupplyTypesController {
  constructor(private readonly service: SupplyTypesService) {}

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
  create(@Body() dto: CreateSupplyTypeDto) {
    return this.service.create(dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplyTypeDto) {
    return this.service.update(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
