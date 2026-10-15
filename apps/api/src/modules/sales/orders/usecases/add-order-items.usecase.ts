// Agregar productos a un pedido ya aceptado y recalcular sus totales.
//
// Los renglones nuevos se costean con la configuracion vigente (el mismo
// computePricing de una cotizacion). La politica de precios (umbral de
// mayoreo, recargo de aroma, descuento, % de anticipo) es la que quedo
// congelada en la cotizacion de origen: es la que el cliente acepto.
//
// Renglones que ya estaban: su costo no se toca. Su precio tampoco, SALVO
// que el pedido cambie de nivel (menudeo <-> mayoreo), en cuyo caso toman el
// precio de lista actual del catalogo para el nivel nuevo; o que la duena
// capture un precio final por pieza, que siempre gana.
//
// plan() es el calculo sin persistir (vista previa); execute() corre el mismo
// plan y lo guarda en una transaccion.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AdjustmentType,
  calculateQuotationTotals,
  marginWarning,
  money,
  resolvePriceTier,
  round2,
  type PriceTier,
  type QuotationLineInput,
} from '@lignumvitae/types';
import { OrderRepository, type OrderWithRelations } from '../order.repository';
import { QuotationRepository } from '../../quotations/quotation.repository';
import { CreateQuotationUseCase } from '../../quotations/usecases/create-quotation.usecase';
import { ProductRepository } from '../../../catalog/products/product.repository';
import { SupplyRepository } from '../../../inventory/supplies/supply.repository';
import { SettingsService } from '../../../settings/settings.service';
import { SalesErrors } from '../../../../common/errors/sales.errors';
import type { AddOrderItemsDto } from '../dto/add-order-items.dto';

interface PricingPolicy {
  fragranceSurcharge: number;
  wholesaleThresholdQty: number;
  depositPct: number;
  roundingMultiple: number;
  accumulatePieces: boolean;
  discountEnabled: boolean;
  discountType: AdjustmentType;
  discountValue: number;
}

export interface AddOrderItemsWarning {
  itemId?: number;
  index?: number;
  marginPct: number;
  minMarginPct: number;
  minUnitPrice: number;
  /** Para renglones nuevos: lo que va en "Precio manual" (antes del aroma). */
  minManualPrice: number;
}

export interface AddOrderItemsPreview {
  priceTier: PriceTier;
  totalQuantity: number;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  depositAmount: number;
  grossProfit: number;
  existing: { itemId: number; previousUnitPrice: number; unitPrice: number; lineTotal: number; tierChanged: boolean }[];
  added: { index: number; priceTier: PriceTier; unitPrice: number; lineTotal: number; lineMargin: number; fragranceMlPerUnit: number }[];
  warnings: AddOrderItemsWarning[];
}

const sumMoney = (values: Prisma.Decimal.Value[]) => round2(values.reduce<ReturnType<typeof money>>((acc, v) => acc.plus(money(v.toString())), money(0)));

@Injectable()
export class AddOrderItemsUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly quotationRepository: QuotationRepository,
    private readonly productRepository: ProductRepository,
    private readonly supplyRepository: SupplyRepository,
    private readonly settingsService: SettingsService,
    private readonly createQuotationUseCase: CreateQuotationUseCase,
  ) {}

  async plan(orderId: number, dto: AddOrderItemsDto): Promise<AddOrderItemsPreview> {
    return (await this.buildPlan(orderId, dto)).preview;
  }

  async execute(orderId: number, dto: AddOrderItemsDto): Promise<OrderWithRelations> {
    const { order, existingUpdates, newItems, orderData } = await this.buildPlan(orderId, dto);
    await this.orderRepository.runInTransaction(async (tx) => {
      for (const { id, data } of existingUpdates) await tx.orderItem.update({ where: { id }, data });
      await tx.orderItem.createMany({ data: newItems });
      await tx.order.update({ where: { id: order.id }, data: orderData });
    });
    return (await this.orderRepository.findById(orderId))!;
  }

  private async policyFor(order: OrderWithRelations, settings: Awaited<ReturnType<SettingsService['get']>>): Promise<PricingPolicy> {
    const quotation = order.quotationId ? await this.quotationRepository.findById(order.quotationId) : null;
    if (quotation) {
      return {
        fragranceSurcharge: quotation.fragranceSurcharge.toNumber(),
        wholesaleThresholdQty: quotation.wholesaleThresholdQty,
        depositPct: quotation.depositPct.toNumber(),
        roundingMultiple: quotation.roundingMultiple.toNumber(),
        accumulatePieces: quotation.accumulatePieces,
        discountEnabled: quotation.discountEnabled,
        discountType: quotation.discountType,
        discountValue: quotation.discountValue.toNumber(),
      };
    }
    // Pedido sin cotizacion: configuracion vigente, y el descuento que ya
    // tenia se conserva como monto fijo.
    return {
      fragranceSurcharge: settings.fragranceSurcharge.toNumber(),
      wholesaleThresholdQty: settings.wholesaleThresholdQty,
      depositPct: settings.depositPct.toNumber(),
      roundingMultiple: settings.roundingMultiple.toNumber(),
      accumulatePieces: true,
      discountEnabled: order.discountAmount.greaterThan(0),
      discountType: AdjustmentType.FIXED,
      discountValue: order.discountAmount.toNumber(),
    };
  }

  private async buildPlan(orderId: number, dto: AddOrderItemsDto) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw SalesErrors.Exceptions.ORDER_NOT_FOUND({ id: orderId });
    if (order.status === 'CANCELLED') throw SalesErrors.Exceptions.ORDER_NOT_EDITABLE({ orderId });
    const capturedPrices = new Map((dto.existingPrices ?? []).map((p) => [p.itemId, p.unitPrice]));
    for (const itemId of capturedPrices.keys()) {
      if (!order.items.some((item) => item.id === itemId)) throw SalesErrors.Exceptions.ORDER_ITEM_NOT_FOUND({ orderId, itemId });
    }

    const settings = await this.settingsService.get();
    const policy = await this.policyFor(order, settings);
    const pricing = await this.createQuotationUseCase.computePricing(dto.items, {}, settings);
    const existingProducts = new Map((await this.productRepository.findManyByIds([...new Set(order.items.map((i) => i.productId))])).map((p) => [p.id, p]));

    const totalQuantity = order.items.reduce((acc, i) => acc + i.quantity, 0) + dto.items.reduce((acc, i) => acc + i.quantity, 0);
    const newOrderTier = resolvePriceTier(totalQuantity, policy.wholesaleThresholdQty);
    // Sin acumular, cada renglon decide con su propia cantidad: la de los
    // existentes no cambia, asi que su nivel tampoco.
    const tierChanged = policy.accumulatePieces && newOrderTier !== order.priceTier;

    const existingInputs: QuotationLineInput[] = order.items.map((item) => {
      const surcharge = item.withFragrance ? policy.fragranceSurcharge : 0;
      const captured = capturedPrices.get(item.id);
      const product = existingProducts.get(item.productId);
      const reprice = captured !== undefined || tierChanged;
      const keepList = item.unitListPrice.toNumber();
      return {
        productId: item.productId,
        quantity: item.quantity,
        withFragrance: item.withFragrance,
        unitTotalCost: item.unitTotalCost.toNumber(),
        retailPrice: reprice && product ? (product.retailPriceOverride ?? product.retailListPrice).toNumber() : keepList,
        wholesalePrice: reprice && product ? (product.wholesalePriceOverride ?? product.wholesaleListPrice).toNumber() : keepList,
        unitPriceOverride:
          captured !== undefined
            ? round2(money(captured).minus(surcharge)).toNumber()
            : reprice
              ? null
              : round2(item.unitPrice.minus(surcharge)).toNumber(),
      };
    });
    const newInputs: QuotationLineInput[] = dto.items.map((item, i) => {
      const product = pricing.productMap.get(item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        withFragrance: Boolean(item.withFragrance),
        unitTotalCost: pricing.costings[i].unitTotalCost,
        retailPrice: (product.retailPriceOverride ?? product.retailListPrice).toNumber(),
        wholesalePrice: (product.wholesalePriceOverride ?? product.wholesaleListPrice).toNumber(),
        unitPriceOverride: item.unitPriceOverride ?? null,
      };
    });

    const totals = calculateQuotationTotals({
      items: [...existingInputs, ...newInputs],
      wholesaleThresholdQty: policy.wholesaleThresholdQty,
      fragranceSurcharge: policy.fragranceSurcharge,
      shippingCost: order.shippingCost.toNumber(),
      discountEnabled: policy.discountEnabled,
      discountType: policy.discountType,
      discountValue: policy.discountValue,
      depositPct: policy.depositPct,
      roundingMultiple: policy.roundingMultiple,
      accumulatePieces: policy.accumulatePieces,
    });
    const existingTotals = totals.items.slice(0, order.items.length);
    const newTotals = totals.items.slice(order.items.length);

    // El costo de los existentes es el guardado (lineCost puede traer el
    // residuo de una division); no se recalcula.
    const lineCosts = [...order.items.map((i) => i.lineCost), ...newTotals.map((t) => t.lineCost)];
    const discountAmount = money(totals.discountAmount);
    const grossProfit = round2(money(totals.subtotal).minus(discountAmount).minus(sumMoney(lineCosts)));

    const minMarginPct = settings.minMarginPct.toNumber();
    const warnings: AddOrderItemsWarning[] = [];
    const warn = (unitPrice: number, unitTotalCost: number, withFragrance: boolean, where: { itemId?: number; index?: number }) => {
      const w = marginWarning({ unitPrice, unitTotalCost, minMarginPct, fragranceCharge: withFragrance ? policy.fragranceSurcharge : 0 });
      if (w) warnings.push({ ...where, marginPct: w.marginPct, minMarginPct: w.minMarginPct, minUnitPrice: w.minUnitPrice, minManualPrice: w.minManualPrice });
    };

    const existingUpdates: { id: number; data: Prisma.OrderItemUpdateInput }[] = [];
    const existing = order.items.map((item, i) => {
      const t = existingTotals[i];
      const changed = !item.unitPrice.equals(t.unitPrice) || !item.unitListPrice.equals(t.unitListPrice);
      if (changed) {
        existingUpdates.push({
          id: item.id,
          data: {
            unitListPrice: t.unitListPrice,
            unitPrice: t.unitPrice,
            priceVariance: t.priceVariance,
            lineTotal: t.lineTotal,
            lineMargin: round2(money(t.lineTotal).minus(item.lineCost.toString())).toNumber(),
          },
        });
        warn(t.unitPrice, item.unitTotalCost.toNumber(), item.withFragrance, { itemId: item.id });
      }
      return { itemId: item.id, previousUnitPrice: item.unitPrice.toNumber(), unitPrice: t.unitPrice, lineTotal: t.lineTotal, tierChanged };
    });
    newTotals.forEach((t, index) => warn(t.unitPrice, pricing.costings[index].unitTotalCost, Boolean(dto.items[index].withFragrance), { index }));

    const fragranceIds = [...new Set(dto.items.map((i) => (i.withFragrance ? i.fragranceSupplyId : undefined)).filter((id): id is number => id != null))];
    const fragranceNames = new Map(
      (fragranceIds.length ? await this.supplyRepository.findMany({ where: { id: { in: fragranceIds } } }) : []).map((s) => [s.id, s.name]),
    );
    const firstSortOrder = Math.max(-1, ...order.items.map((i) => i.sortOrder)) + 1;
    const newItems: Prisma.OrderItemCreateManyInput[] = dto.items.map((item, i) => {
      const c = pricing.costings[i];
      const t = newTotals[i];
      return {
        orderId: order.id,
        productId: item.productId,
        sortOrder: firstSortOrder + i,
        productName: pricing.productMap.get(item.productId)!.name,
        quantity: item.quantity,
        candleColor: item.candleColor || null,
        ribbonColor: item.ribbonColor || null,
        extraFields: (item.extraFields ?? []).map(({ supplyId, label, value }) => ({ supplyId, label, value })),
        withFragrance: Boolean(item.withFragrance),
        fragranceName: item.withFragrance && item.fragranceSupplyId != null ? (fragranceNames.get(item.fragranceSupplyId) ?? null) : null,
        personalizationText: item.personalizationText || null,
        waxGramsPerUnit: c.waxGramsPerUnit,
        laborMinutesPerUnit: c.laborMinutesPerUnit,
        unitWaxCost: c.unitWaxCost,
        unitSupplyCost: c.unitSupplyCost,
        unitFragranceCost: c.unitFragranceCost,
        fragranceMlPerUnit: c.fragranceMlPerUnit,
        unitLaborCost: c.unitLaborCost,
        unitOverheadCost: c.unitOverheadCost,
        unitTotalCost: c.unitTotalCost,
        unitListPrice: t.unitListPrice,
        unitPrice: t.unitPrice,
        priceVariance: t.priceVariance,
        lineTotal: t.lineTotal,
        lineCost: t.lineCost,
        lineMargin: t.lineMargin,
        suppliesSnapshot: c.resolvedSupplies as unknown as Prisma.InputJsonValue,
      };
    });

    // Mismo criterio que al crear el pedido: costo unitario x cantidad.
    const costSum = (pick: (u: { unitSupplyCost: number; unitLaborCost: number; unitOverheadCost: number; unitTotalCost: number }) => number) =>
      sumMoney([
        ...order.items.map((i) =>
          money(pick({
            unitSupplyCost: i.unitSupplyCost.toNumber(),
            unitLaborCost: i.unitLaborCost.toNumber(),
            unitOverheadCost: i.unitOverheadCost.toNumber(),
            unitTotalCost: i.unitTotalCost.toNumber(),
          })).times(i.quantity).toString(),
        ),
        ...dto.items.map((item, i) => money(pick(pricing.costings[i])).times(item.quantity).toString()),
      ]);

    const orderData: Prisma.OrderUpdateInput = {
      priceTier: totals.priceTier,
      totalQuantity: totals.totalQuantity,
      totalWaxGrams: round2(money(order.totalWaxGrams.toString()).plus(pricing.totalWaxGrams)).toNumber(),
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      total: totals.total,
      depositAmount: totals.depositAmount,
      totalSupplyCost: costSum((u) => u.unitSupplyCost).toNumber(),
      totalLaborCost: costSum((u) => u.unitLaborCost).toNumber(),
      totalOverheadCost: costSum((u) => u.unitOverheadCost).toNumber(),
      totalCost: costSum((u) => u.unitTotalCost).toNumber(),
      grossProfit: grossProfit.toNumber(),
    };

    const preview: AddOrderItemsPreview = {
      priceTier: totals.priceTier,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      shippingCost: totals.shippingCost,
      total: totals.total,
      depositAmount: totals.depositAmount,
      grossProfit: grossProfit.toNumber(),
      existing,
      added: newTotals.map((t, index) => ({
        index,
        priceTier: t.priceTier,
        unitPrice: t.unitPrice,
        lineTotal: t.lineTotal,
        lineMargin: t.lineMargin,
        fragranceMlPerUnit: pricing.costings[index].fragranceMlPerUnit,
      })),
      warnings,
    };

    return { order, preview, existingUpdates, newItems, orderData };
  }
}
