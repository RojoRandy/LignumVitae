import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { AssetsService } from './assets.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('Inventory')
@Auth(UserRoles.admin, UserRoles.super_user)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.deactivate(id);
  }
}
