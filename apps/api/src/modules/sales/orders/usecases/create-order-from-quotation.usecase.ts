// Aceptar una cotizacion Y crear el pedido son la MISMA accion atomica: el
// esquema no modela un estado intermedio util ("ACCEPTED sin pedido"),
// Quotation.order es 1:1 directo. Todo pasa en una sola transaccion: crear
// el Order, copiar cada QuotationItem -> OrderItem con sus campos
// congelados (incluidos laborMinutesPerUnit/waxGramsPerUnit, que
// OverheadRepository.sumProducedLabor ya lee de pedidos DELIVERED), y
// marcar la cotizacion ACCEPTED.
import { Injectable } from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { money, round2 } from '@lignumvitae/types';
import { QuotationRepository } from '../../quotations/quotation.repository';
import { OrderRepository, type OrderWithRelations } from '../order.repository';
import { SettingsService } from '../../../settings/settings.service';
import { FolioService } from '../../../../common/folio/folio.service';
import { SalesErrors } from '../../../../common/errors/sales.errors';
import { UseCase } from '../../../../common/interfaces/use-case.interface';

export interface CreateOrderFromQuotationArgs {
  quotationId: number;
  userId?: number;
}

const ACCEPTABLE_STATUSES: QuotationStatus[] = ['SENT', 'VIEWED'];

@Injectable()
export class CreateOrderFromQuotationUseCase implements UseCase<CreateOrderFromQuotationArgs, OrderWithRelations> {
  constructor(
    private readonly quotationRepository: QuotationRepository,
    private readonly orderRepository: OrderRepository,
    private readonly settingsService: SettingsService,
    private readonly folioService: FolioService,
  ) {}

  async execute({ quotationId, userId }: CreateOrderFromQuotationArgs): Promise<OrderWithRelations> {
    await this.quotationRepository.expireOverdue();
    const quotation = await this.quotationRepository.findById(quotationId);
    if (!quotation) throw SalesErrors.Exceptions.QUOTATION_NOT_FOUND({ id: quotationId });
    if (quotation.status === 'EXPIRED') throw SalesErrors.Exceptions.QUOTATION_EXPIRED({ id: quotationId });
    if (quotation.order || quotation.status === 'ACCEPTED') {
      throw SalesErrors.Exceptions.QUOTATION_ALREADY_CONVERTED({ id: quotationId });
    }
    if (!ACCEPTABLE_STATUSES.includes(quotation.status)) {
      throw SalesErrors.Exceptions.QUOTATION_NOT_ACCEPTABLE({ id: quotationId, status: quotation.status });
    }

    const settings = await this.settingsService.get();
    const orderDate = new Date();
    // El pedido nunca falla la transaccion por falta de fecha: si la
    // cotizacion no trae fecha de evento, usa el minimo de anticipacion.
    const dueDate = quotation.eventDate ?? (() => {
      const d = new Date(orderDate);
      d.setDate(d.getDate() + settings.minLeadTimeDays);
      return d;
    })();

    const totalSupplyCost = round2(quotation.items.reduce((acc, i) => acc.plus(money(i.unitSupplyCost).times(i.quantity)), money(0)));
    const totalLaborCost = round2(quotation.items.reduce((acc, i) => acc.plus(money(i.unitLaborCost).times(i.quantity)), money(0)));
    const totalOverheadCost = round2(quotation.items.reduce((acc, i) => acc.plus(money(i.unitOverheadCost).times(i.quantity)), money(0)));
    const totalCost = round2(quotation.items.reduce((acc, i) => acc.plus(money(i.unitTotalCost).times(i.quantity)), money(0)));

    // Copia inmutable serializada de la cotizacion completa (con renglones),
    // para auditar el pedido aunque la cotizacion se edite/borre despues.
    const snapshot = JSON.parse(JSON.stringify(quotation)) as Prisma.InputJsonValue;

    const year = orderDate.getUTCFullYear();

    // El unique constraint de Order.quotationId es la guarda de verdad
    // contra una carrera de dos "aceptar" al mismo tiempo (el chequeo de
    // arriba, sobre quotation.order, cubre el caso normal sin condicion de
    // carrera).
    const order = await this.quotationRepository.runInTransaction(async (tx) => {
        const folio = await this.folioService.next('order', settings.orderFolioPrefix, year, tx);

        const created = await tx.order.create({
          data: {
            folio,
            quotationId: quotation.id,
            customerId: quotation.customerId,
            status: 'PENDING_DEPOSIT',
            orderDate,
            dueDate,
            priceTier: quotation.priceTier,
            totalQuantity: quotation.totalQuantity,
            totalWaxGrams: quotation.totalWaxGrams,
            subtotal: quotation.subtotal,
            discountAmount: quotation.discountAmount,
            shippingCost: quotation.shippingCost,
            total: quotation.total,
            paidAmount: 0,
            depositAmount: quotation.depositAmount,
            totalSupplyCost,
            totalLaborCost,
            totalOverheadCost,
            totalCost,
            grossProfit: quotation.grossProfit,
            currency: quotation.currency,
            snapshot,
            notes: quotation.notes,
            createdById: userId,
          },
        });

        await tx.orderItem.createMany({
          data: quotation.items.map((item, i) => ({
            orderId: created.id,
            productId: item.productId,
            sortOrder: i,
            productName: item.product.name,
            quantity: item.quantity,
            candleColor: item.candleColor,
            ribbonColor: item.ribbonColor,
            withFragrance: item.withFragrance,
            fragranceName: item.fragranceSupply?.name ?? null,
            personalizationText: item.personalizationText,
            waxGramsPerUnit: item.waxGramsPerUnit,
            laborMinutesPerUnit: item.laborMinutesPerUnit,
            unitWaxCost: item.unitWaxCost,
            unitSupplyCost: item.unitSupplyCost,
            unitFragranceCost: item.unitFragranceCost,
            unitLaborCost: item.unitLaborCost,
            unitOverheadCost: item.unitOverheadCost,
            unitTotalCost: item.unitTotalCost,
            unitListPrice: item.unitListPrice,
            unitPrice: item.unitPrice,
            priceVariance: item.priceVariance,
            lineTotal: item.lineTotal,
            lineCost: item.lineCost,
            lineMargin: item.lineMargin,
            suppliesSnapshot: item.suppliesSnapshot as Prisma.InputJsonValue,
          })),
        });

        await tx.quotation.update({ where: { id: quotation.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });

        return created;
      });

    return (await this.orderRepository.findById(order.id))!;
  }
}
