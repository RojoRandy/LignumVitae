import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { SuppliesService } from './supplies.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateSupplyDto, UpdateSupplyDto } from './dto/create-supply.dto';
import { FindSuppliesQueryDto } from './dto/find-supplies.query.dto';

@ApiTags('Inventory')
@Auth()
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get()
  findAll(@Query() query: FindSuppliesQueryDto) {
    return this.suppliesService.findAll(query);
  }

  @Get('low-stock')
  findLowStock() {
    return this.suppliesService.findLowStock();
  }

  @Get('cost-drift')
  findWithCostDrift() {
    return this.suppliesService.findWithCostDrift();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.suppliesService.findById(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post()
  create(@Body() dto: CreateSupplyDto) {
    return this.suppliesService.create(dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplyDto) {
    return this.suppliesService.update(id, dto);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post(':id/apply-suggested-cost')
  applySuggestedCost(@Param('id', ParseIntPipe) id: number) {
    return this.suppliesService.applySuggestedCost(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.suppliesService.deactivate(id);
  }
}
