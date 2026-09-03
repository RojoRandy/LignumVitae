import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { OrdersService } from './orders.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { AuthUser } from '../../auth/decorators/auth-user.decorator';
import { FindOrdersQueryDto } from './dto/find-orders.query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Sales')
@Auth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }

  // Aceptar una cotizacion crea un pedido y compromete un anticipo: no es
  // trabajo de nivel empleado, requiere admin/super_user.
  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post('from-quotation/:quotationId')
  acceptFromQuotation(@Param('quotationId', ParseIntPipe) quotationId: number, @AuthUser('id') userId: number) {
    return this.ordersService.acceptFromQuotation(quotationId, userId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
