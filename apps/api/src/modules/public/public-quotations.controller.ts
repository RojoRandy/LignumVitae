// Sin @Auth() en ningun lado: es el enlace que se le manda al cliente por
// WhatsApp/correo, no tiene sesion. La proteccion es el publicToken en si
// (un UUID, no adivinable) mas el ThrottlerGuard global (120 req/min).
import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QuotationsService } from '../sales/quotations/quotations.service';
import { OrdersService } from '../sales/orders/orders.service';
import { toPublicQuotationDto } from './dto/public-quotation.dto';

@ApiTags('Public')
@Controller('public/quotations')
export class PublicQuotationsController {
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get(':token')
  async findByToken(@Param('token') token: string) {
    const quotation = await this.quotationsService.findByPublicToken(token);
    await this.quotationsService.markViewed(quotation.id, quotation.status);
    // Se relee para reflejar VIEWED si acaba de cambiar.
    const fresh = quotation.status === 'SENT' ? await this.quotationsService.findByPublicToken(token) : quotation;
    return toPublicQuotationDto(fresh);
  }

  // Mismo use case que el boton "Aceptar y crear pedido" del admin: sin
  // userId, createdById del pedido queda null (aceptacion de origen publico).
  @Post(':token/accept')
  async accept(@Param('token') token: string) {
    const quotation = await this.quotationsService.findByPublicToken(token);
    const order = await this.ordersService.acceptFromQuotation(quotation.id);
    return { folio: order.folio, total: order.total, depositAmount: order.depositAmount };
  }

  @Post(':token/reject')
  async reject(@Param('token') token: string) {
    const quotation = await this.quotationsService.findByPublicToken(token);
    await this.quotationsService.reject(quotation.id);
    return { status: 'REJECTED' };
  }
}
