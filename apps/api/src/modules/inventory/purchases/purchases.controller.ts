import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { PurchasesService } from './purchases.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FindPurchasesQueryDto } from './dto/find-purchases.query.dto';

@ApiTags('Inventory')
@Auth(UserRoles.admin, UserRoles.super_user)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(@Query() query: FindPurchasesQueryDto) {
    return this.purchasesService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.findById(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.deactivate(id);
  }
}
