import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupplyRepository } from '../../inventory/supplies/supply.repository';
import type { SetOrderItemFragranceDto } from './dto/set-order-item-fragrance.dto';
import { OrderRepository } from './order.repository';
import { CreateOrderFromQuotationUseCase } from './usecases/create-order-from-quotation.usecase';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { SalesErrors } from '../../../common/errors/sales.errors';
import type { FindOrdersQueryDto } from './dto/find-orders.query.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly createOrderFromQuotationUseCase: CreateOrderFromQuotationUseCase,
    private readonly supplyRepository: SupplyRepository,
  ) {}

  async findAll(query: FindOrdersQueryDto & Pick<PaginationQueryDto, 'onlyActive'>) {
    const { page = 1, limit = 20, status, customerId, onlyActive = true } = query;
    const where: Prisma.OrderWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    };
    // Orden por dueDate ascendente por defecto: es la "cola de produccion"
    // que insinuan los indices del modelo (status + dueDate).
    const [items, total] = await Promise.all([
      this.orderRepository.findMany({ where, orderBy: { dueDate: 'asc' }, ...paginate(page, limit) }),
      this.orderRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const order = await this.orderRepository.findById(id);
    if (!order) throw SalesErrors.Exceptions.ORDER_NOT_FOUND({ id });
    return order;
  }

  async setItemFragrance(orderId: number, itemId: number, dto: SetOrderItemFragranceDto) {
    const order = await this.findById(orderId);
    const item = order.items.find((item) => item.id === itemId);
    if (!item) throw SalesErrors.Exceptions.ORDER_ITEM_NOT_FOUND({ orderId, itemId });
    if (order.status === 'CANCELLED') throw SalesErrors.Exceptions.ORDER_NOT_EDITABLE({ orderId });
    if (!item.withFragrance) throw SalesErrors.Exceptions.ORDER_ITEM_WITHOUT_FRAGRANCE({ orderId, itemId });

    const { fragranceSupplyId } = dto;
    const supply = await this.supplyRepository.findById(fragranceSupplyId);
    if (!supply || !supply.isActive || !supply.isFragrance) {
      throw SalesErrors.Exceptions.INVALID_FRAGRANCE_SUPPLY({ fragranceSupplyId });
    }
    await this.orderRepository.updateItem(itemId, { fragranceName: supply.name });
    return this.findById(orderId);
  }

  acceptFromQuotation(quotationId: number, userId?: number) {
    return this.createOrderFromQuotationUseCase.execute({ quotationId, userId });
  }

  /** Sin maquina de estados: cualquier valor del enum es valido, es trabajo
   *  operativo diario que se cambia a mano segun avanza la produccion. El
   *  unico campo derivado automaticamente es la fecha de entrega/cancelacion
   *  -- deliveredAt es la restriccion dura que ya depende de esto
   *  (OverheadRepository.sumProducedLabor solo cuenta pedidos DELIVERED). */
  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    await this.findById(id);
    const data: Prisma.OrderUpdateInput = { status: dto.status };
    if (dto.status === 'DELIVERED') data.deliveredAt = new Date();
    if (dto.status === 'CANCELLED') data.cancelledAt = new Date();
    await this.orderRepository.update(id, data);
    return this.findById(id);
  }
}
