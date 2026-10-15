import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { money, round2 } from '@lignumvitae/types';
import { SupplyRepository } from '../../inventory/supplies/supply.repository';
import type { SetOrderItemFragranceDto } from './dto/set-order-item-fragrance.dto';
import type { SplitOrderItemDto } from './dto/split-order-item.dto';
import type { UpdateOrderItemDto } from './dto/update-order-item.dto';
import type { UpdateOrderDto } from './dto/update-order.dto';
import { OrderRepository } from './order.repository';
import { CreateOrderFromQuotationUseCase } from './usecases/create-order-from-quotation.usecase';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { SalesErrors } from '../../../common/errors/sales.errors';
import type { FindOrdersQueryDto } from './dto/find-orders.query.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type Amount = Prisma.Decimal | string;

/** Importes de cada parte al dividir un renglon. La ultima parte se queda con
 *  el residuo para que la suma de las partes sea exactamente la del renglon
 *  original: los totales del Order no se recalculan. */
export function splitLineAmounts(
  item: { unitPrice: Amount; unitTotalCost: Amount; lineTotal: Amount; lineCost: Amount },
  quantities: number[],
): { lineTotal: string; lineCost: string; lineMargin: string }[] {
  let restTotal = money(item.lineTotal.toString());
  let restCost = money(item.lineCost.toString());
  return quantities.map((quantity, i) => {
    const isLast = i === quantities.length - 1;
    const lineTotal = isLast ? restTotal : round2(money(item.unitPrice.toString()).times(quantity));
    const lineCost = isLast ? restCost : round2(money(item.unitTotalCost.toString()).times(quantity));
    restTotal = restTotal.minus(lineTotal);
    restCost = restCost.minus(lineCost);
    return { lineTotal: lineTotal.toFixed(2), lineCost: lineCost.toFixed(2), lineMargin: lineTotal.minus(lineCost).toFixed(2) };
  });
}

const blankToNull = (value: string) => value.trim() || null;

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

  private async findEditableItem(orderId: number, itemId: number) {
    const order = await this.findById(orderId);
    const item = order.items.find((item) => item.id === itemId);
    if (!item) throw SalesErrors.Exceptions.ORDER_ITEM_NOT_FOUND({ orderId, itemId });
    if (order.status === 'CANCELLED') throw SalesErrors.Exceptions.ORDER_NOT_EDITABLE({ orderId });
    return { order, item };
  }

  private async resolveFragranceName(fragranceSupplyId: number): Promise<string> {
    const supply = await this.supplyRepository.findById(fragranceSupplyId);
    if (!supply || !supply.isActive || !supply.isFragrance) {
      throw SalesErrors.Exceptions.INVALID_FRAGRANCE_SUPPLY({ fragranceSupplyId });
    }
    return supply.name;
  }

  async setItemFragrance(orderId: number, itemId: number, dto: SetOrderItemFragranceDto) {
    const { item } = await this.findEditableItem(orderId, itemId);
    if (!item.withFragrance) throw SalesErrors.Exceptions.ORDER_ITEM_WITHOUT_FRAGRANCE({ orderId, itemId });

    const fragranceName = await this.resolveFragranceName(dto.fragranceSupplyId);
    await this.orderRepository.updateItem(itemId, { fragranceName });
    return this.findById(orderId);
  }

  /** Completar datos que faltaban al aceptar (fecha del evento, notas). No
   *  toca dinero ni estado. */
  async update(id: number, dto: UpdateOrderDto) {
    const order = await this.findById(id);
    if (order.status === 'CANCELLED') throw SalesErrors.Exceptions.ORDER_NOT_EDITABLE({ orderId: id });

    const data: Prisma.OrderUpdateInput = {};
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);
    if (dto.notes !== undefined) data.notes = blankToNull(dto.notes);
    if (Object.keys(data).length > 0) await this.orderRepository.update(id, data);
    return this.findById(id);
  }

  /** Datos descriptivos del renglon. Cantidades y precios no se editan aqui:
   *  para repartir cantidades esta splitItem. */
  async updateItem(orderId: number, itemId: number, dto: UpdateOrderItemDto) {
    const { item } = await this.findEditableItem(orderId, itemId);

    const data: Prisma.OrderItemUpdateInput = {};
    if (dto.fragranceSupplyId !== undefined) {
      if (!item.withFragrance) throw SalesErrors.Exceptions.ORDER_ITEM_WITHOUT_FRAGRANCE({ orderId, itemId });
      data.fragranceName = await this.resolveFragranceName(dto.fragranceSupplyId);
    }
    if (dto.candleColor !== undefined) data.candleColor = blankToNull(dto.candleColor);
    if (dto.ribbonColor !== undefined) data.ribbonColor = blankToNull(dto.ribbonColor);
    if (dto.personalizationText !== undefined) data.personalizationText = blankToNull(dto.personalizationText);
    if (dto.extraFields !== undefined) data.extraFields = dto.extraFields as unknown as Prisma.InputJsonValue;
    if (Object.keys(data).length > 0) await this.orderRepository.updateItem(itemId, data);
    return this.findById(orderId);
  }

  /** Reparte un renglon en varios (p. ej. 31 ositos -> 15 lavanda, 10
   *  vainilla, 6 rosas). Cada parte conserva costos y precio unitario; la
   *  suma de cantidades e importes es la del original. */
  async splitItem(orderId: number, itemId: number, dto: SplitOrderItemDto) {
    const { item } = await this.findEditableItem(orderId, itemId);
    const received = dto.parts.reduce((sum, part) => sum + part.quantity, 0);
    if (received !== item.quantity) {
      throw SalesErrors.Exceptions.ORDER_ITEM_SPLIT_MISMATCH({ orderId, itemId, expected: item.quantity, received });
    }
    if (!item.withFragrance && dto.parts.some((part) => part.fragranceSupplyId !== undefined)) {
      throw SalesErrors.Exceptions.ORDER_ITEM_WITHOUT_FRAGRANCE({ orderId, itemId });
    }

    const fragranceNames = new Map<number, string>();
    for (const id of new Set(dto.parts.map((part) => part.fragranceSupplyId).filter((id): id is number => id !== undefined))) {
      fragranceNames.set(id, await this.resolveFragranceName(id));
    }

    const amounts = splitLineAmounts(item, dto.parts.map((part) => part.quantity));
    const parts = dto.parts.map((part, i) => ({
      quantity: part.quantity,
      candleColor: part.candleColor !== undefined ? blankToNull(part.candleColor) : item.candleColor,
      fragranceName: part.fragranceSupplyId !== undefined ? fragranceNames.get(part.fragranceSupplyId)! : item.fragranceName,
      ...amounts[i],
    }));

    const { id: _id, ...copy } = item;
    const rest: Prisma.OrderItemCreateManyInput[] = parts.slice(1).map((part) => ({
      ...copy,
      extraFields: copy.extraFields as Prisma.InputJsonValue,
      suppliesSnapshot: copy.suppliesSnapshot as Prisma.InputJsonValue,
      ...part,
    }));

    await this.orderRepository.splitItem(orderId, itemId, parts[0], rest);
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
