import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { AuthUser } from '../../auth/decorators/auth-user.decorator';
import { RegisterPaymentDto } from './dto/register-payment.dto';

@ApiTags('Sales')
@Auth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('orders/:orderId/payments')
  findByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Post('orders/:orderId/payments')
  register(@Param('orderId', ParseIntPipe) orderId: number, @Body() dto: RegisterPaymentDto, @AuthUser('id') userId: number) {
    return this.paymentsService.register(orderId, dto, userId);
  }

  // Cancelar dinero ya registrado es admin-only, igual que en el proyecto de referencia.
  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch('payments/:id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.cancel(id);
  }
}
