import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
