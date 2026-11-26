import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { OrdersService } from './orders.service';
import { AddOrderItemsUseCase } from './usecases/add-order-items.usecase';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { Auth } from '../../auth/decorators/auth.decorator';
import { AuthUser } from '../../auth/decorators/auth-user.decorator';
import { FindOrdersQueryDto } from './dto/find-orders.query.dto';
import { PrintOrdersQueryDto } from './dto/print-orders.query.dto';
import { SetOrderItemFragranceDto } from './dto/set-order-item-fragrance.dto';
import { SplitOrderItemDto } from './dto/split-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PdfService } from '../../pdf/pdf.service';

@ApiTags('Sales')
@Auth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly addOrderItemsUseCase: AddOrderItemsUseCase,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  findAll(@Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  // PDF binario: @Res passthrough:false salta el ApiResponseInterceptor global,
  // igual que en cotizaciones. Va antes de ':id' para que 'pdf' no se tome como id.
  @Get('pdf')
  async pdfActive(@Query() query: PrintOrdersQueryDto, @Res({ passthrough: false }) res: Response) {
    const buffer = await this.pdfService.renderOrdersPdf(await this.ordersService.findActiveForPrint(query.ids), 'Pedidos activos');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="pedidos-activos.pdf"');
    res.send(buffer);
  }

  @Get(':id/pdf')
  async pdfOne(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: false }) res: Response) {
    const order = await this.ordersService.findById(id);
    const buffer = await this.pdfService.renderOrdersPdf([order], `Pedido ${order.folio}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${order.folio}.pdf"`);
    res.send(buffer);
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

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  // Vista previa: el mismo calculo que agregar, sin guardar nada.
  @Post(':id/items/preview')
  previewAddItems(@Param('id', ParseIntPipe) id: number, @Body() dto: AddOrderItemsDto) {
    return this.addOrderItemsUseCase.plan(id, dto);
  }

  @Post(':id/items')
  addItems(@Param('id', ParseIntPipe) id: number, @Body() dto: AddOrderItemsDto) {
    return this.addOrderItemsUseCase.execute(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(id, itemId, dto);
  }

  @Post(':id/items/:itemId/split')
  splitItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: SplitOrderItemDto,
  ) {
    return this.ordersService.splitItem(id, itemId, dto);
  }

  @Patch(':id/items/:itemId/fragrance')
  setItemFragrance(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: SetOrderItemFragranceDto,
  ) {
    return this.ordersService.setItemFragrance(id, itemId, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
