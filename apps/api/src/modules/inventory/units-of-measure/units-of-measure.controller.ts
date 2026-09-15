import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateUnitOfMeasureDto, UpdateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('Catalog')
@Auth()
@Controller('units-of-measure')
export class UnitsOfMeasureController {
  constructor(private readonly service: UnitsOfMeasureService) {}

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
  create(@Body() dto: CreateUnitOfMeasureDto) {
    return this.service.create(dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnitOfMeasureDto) {
    return this.service.update(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
