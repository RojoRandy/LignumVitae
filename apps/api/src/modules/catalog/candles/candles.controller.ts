import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { CandlesService } from './candles.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateCandleDto, UpdateCandleDto } from './dto/create-candle.dto';
import { FindCandlesQueryDto } from './dto/find-candles.query.dto';

@ApiTags('Catalog')
@Auth()
@Controller('candles')
export class CandlesController {
  constructor(private readonly candlesService: CandlesService) {}

  @Get()
  findAll(@Query() query: FindCandlesQueryDto) {
    return this.candlesService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.candlesService.findById(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post()
  create(@Body() dto: CreateCandleDto) {
    return this.candlesService.create(dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCandleDto) {
    return this.candlesService.update(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.candlesService.deactivate(id);
  }
}
