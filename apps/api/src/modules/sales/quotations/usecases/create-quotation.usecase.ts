// Crea o actualiza una cotizacion completa: costea cada renglon contra el
// producto real, arma los totales con calculateQuotationTotals (el mismo
// motor que usa un pedido), valida el piso de margen de cualquier precio
// manual, y CONGELA toda la politica de precios vigente en la cotizacion --
// para que una cotizacion de hace seis meses siga cuadrando aunque cambien
// los markups o la cera suba de precio.
//
// computePricing() esta separado de execute() a proposito: es exactamente
// el mismo calculo que necesita el panel "en vivo" del editor
// (PreviewQuotationTotalsUseCase), sin persistir nada. Una sola fuente de
// verdad para el costeo, dos consumidores.
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculateQuotationTotals, validateMinMargin, type QuotationLineInput, type QuotationTotals } from '@lignumvitae/types';
import { QuotationRepository, type QuotationWithRelations } from '../quotation.repository';
import { QuotationLineCostingService } from '../services/quotation-line-costing.service';
import type { ProductCostingResult } from '../../../catalog/products/services/product-costing-calculator.service';
import { CustomerRepository } from '../../customers/customer.repository';
import { ProductRepository, type ProductWithRelations } from '../../../catalog/products/product.repository';
import { SettingsService } from '../../../settings/settings.service';
import { OverheadRepository } from '../../../inventory/overhead/overhead.repository';
import { SupplyRepository } from '../../../inventory/supplies/supply.repository';
import { FolioService } from '../../../../common/folio/folio.service';
import { SalesErrors } from '../../../../common/errors/sales.errors';
import { CatalogErrors } from '../../../../common/errors/catalog.errors';
import { UseCase } from '../../../../common/interfaces/use-case.interface';
import { CreateQuotationDto } from '../dto/create-quotation.dto';
import type { PreviewQuotationTotalsDto } from '../dto/preview-quotation-totals.dto';

export interface CreateQuotationArgs {
  dto: CreateQuotationDto;
  userId?: number;
  /** Si viene, actualiza esta cotizacion en vez de crear una nueva. */
  existingId?: number;
}

export interface QuotationPricingResult {
  totals: QuotationTotals;
  costings: ProductCostingResult[];
  productMap: Map<number, ProductWithRelations>;
  defaultWaxUnitCost: number;
  laborRatePerMinute: number;
  overheadRatePerMinute: number;
  totalWaxGrams: number;
}

@Injectable()
export class CreateQuotationUseCase implements UseCase<CreateQuotationArgs, QuotationWithRelations> {
  constructor(
    private readonly quotationRepository: QuotationRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository,
    private readonly settingsService: SettingsService,
    private readonly overheadRepository: OverheadRepository,
    private readonly supplyRepository: SupplyRepository,
    private readonly lineCosting: QuotationLineCostingService,
    private readonly folioService: FolioService,
  ) {}

  /** Costea los renglones y arma los totales, sin persistir nada. Lanza los
   *  mismos errores (producto invalido, piso de margen) que execute(). */
  async computePricing(
    items: (CreateQuotationDto | PreviewQuotationTotalsDto)['items'],
    adjustments: Pick<CreateQuotationDto, 'discountEnabled' | 'discountType' | 'discountValue' | 'shippingCost'>,
    settings: Awaited<ReturnType<SettingsService['get']>>,
  ): Promise<QuotationPricingResult> {
    const closedPeriod = await this.overheadRepository.findMostRecentClosed();
    const laborRatePerMinute = settings.dailyWage.dividedBy(settings.workHoursPerDay).dividedBy(60).toNumber();
    const overheadRatePerMinute =
      settings.overheadRateMode === 'FIXED' || !closedPeriod
        ? settings.overheadRatePerMinute.toNumber()
        : closedPeriod.ratePerMinute.toNumber();
    const defaultWaxUnitCost = settings.waxSupplyId
      ? ((await this.supplyRepository.findById(settings.waxSupplyId))?.currentUnitCost.toNumber() ?? 0)
      : 0;

    const products = await this.productRepository.findManyByIds(items.map((i) => i.productId));
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) throw CatalogErrors.Exceptions.PRODUCT_NOT_FOUND({ productId: item.productId });
    }

    const fragranceIds = [...new Set(items.map((i) => i.fragranceSupplyId).filter((id): id is number => id != null))];
    const fragranceMap = new Map(
      (fragranceIds.length ? await this.supplyRepository.findMany({ where: { id: { in: fragranceIds } } }) : []).map((s) => [s.id, s]),
    );
    for (const item of items) {
      if (item.fragranceSupplyId == null) continue;
      const s = fragranceMap.get(item.fragranceSupplyId);
      if (!s || !s.isActive || !s.isFragrance) {
        throw SalesErrors.Exceptions.INVALID_FRAGRANCE_SUPPLY({ fragranceSupplyId: item.fragranceSupplyId });
      }
    }

    const costings = items.map((item) =>
      this.lineCosting.costLine(
        productMap.get(item.productId)!,
        {
          quantity: item.quantity,
          setupMinutesOverride: item.setupMinutesOverride,
          withFragrance: Boolean(item.withFragrance),
          fragranceUnitCost: item.fragranceSupplyId ? (fragranceMap.get(item.fragranceSupplyId)?.currentUnitCost.toNumber() ?? null) : null,
        },
        { settings, laborRatePerMinute, overheadRatePerMinute, defaultWaxUnitCost, fragranceLoadPct: settings.fragranceLoadPct.toNumber() },
      ),
    );

    const lineInputs: QuotationLineInput[] = items.map((item, i) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        withFragrance: Boolean(item.withFragrance),
        unitTotalCost: costings[i].unitTotalCost,
        retailPrice: (product.retailPriceOverride ?? product.retailListPrice).toNumber(),
        wholesalePrice: (product.wholesalePriceOverride ?? product.wholesaleListPrice).toNumber(),
        unitPriceOverride: item.unitPriceOverride ?? null,
      };
    });

    const totals = calculateQuotationTotals({
      items: lineInputs,
      wholesaleThresholdQty: settings.wholesaleThresholdQty,
      fragranceSurcharge: settings.fragranceSurcharge.toNumber(),
      shippingCost: adjustments.shippingCost ?? 0,
      discountEnabled: adjustments.discountEnabled ?? false,
      discountType: adjustments.discountType ?? 'PERCENTAGE',
      discountValue: adjustments.discountValue ?? 0,
      depositPct: settings.depositPct.toNumber(),
      roundingMultiple: settings.roundingMultiple.toNumber(),
    });

    // El piso de margen se valida sobre el precio YA calculado (con aroma
    // incluido), no sobre el override crudo: es lo que el cliente de verdad
    // paga por pieza.
    items.forEach((item, i) => {
      if (item.unitPriceOverride === undefined) return;
      const check = validateMinMargin(totals.items[i].unitPrice, costings[i].unitTotalCost, settings.minMarginPct.toNumber());
      if (!check.ok) {
        throw SalesErrors.Exceptions.BELOW_MIN_MARGIN({
          productId: item.productId,
          unitPrice: totals.items[i].unitPrice,
          marginPct: check.marginPct,
          minMarginPct: settings.minMarginPct.toNumber(),
          minPrice: check.minPrice,
        });
      }
    });

    const totalWaxGrams = items.reduce((acc, item, i) => acc + costings[i].waxGramsPerUnit * item.quantity, 0);

    return { totals, costings, productMap, defaultWaxUnitCost, laborRatePerMinute, overheadRatePerMinute, totalWaxGrams };
  }

  async execute({ dto, userId, existingId }: CreateQuotationArgs): Promise<QuotationWithRelations> {
    const customer = await this.customerRepository.findById(dto.customerId);
    if (!customer) throw SalesErrors.Exceptions.CUSTOMER_NOT_FOUND({ id: dto.customerId });

    const settings = await this.settingsService.get();

    if (dto.eventDate) {
      const minEventDate = new Date();
      minEventDate.setDate(minEventDate.getDate() + settings.minLeadTimeDays);
      if (new Date(dto.eventDate) < minEventDate) {
        throw SalesErrors.Exceptions.LEAD_TIME_TOO_SHORT({
          eventDate: dto.eventDate,
          minEventDate: minEventDate.toISOString().slice(0, 10),
          minLeadTimeDays: settings.minLeadTimeDays,
        });
      }
    }

    const { totals, costings, defaultWaxUnitCost, laborRatePerMinute, overheadRatePerMinute, totalWaxGrams } = await this.computePricing(
      dto.items,
      dto,
      settings,
    );

    const quotationData = {
      customerId: dto.customerId,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
      waxUnitCost: defaultWaxUnitCost,
      laborRatePerMinute,
      overheadRatePerMinute,
      meltBatchGrams: settings.meltBatchGrams,
      retailMarkupPct: settings.retailMarkupPct,
      wholesaleMarkupPct: settings.wholesaleMarkupPct,
      wholesaleThresholdQty: settings.wholesaleThresholdQty,
      fragranceSurcharge: settings.fragranceSurcharge,
      roundingMultiple: settings.roundingMultiple,
      depositPct: settings.depositPct,
      priceTier: totals.priceTier,
      totalQuantity: totals.totalQuantity,
      totalWaxGrams,
      subtotal: totals.subtotal,
      discountEnabled: dto.discountEnabled ?? false,
      discountType: dto.discountType ?? 'PERCENTAGE',
      discountValue: dto.discountValue ?? 0,
      discountAmount: totals.discountAmount,
      shippingCost: totals.shippingCost,
      total: totals.total,
      depositAmount: totals.depositAmount,
      totalCost: totals.totalCost,
      grossProfit: totals.grossProfit,
      grossMarginPct: totals.grossMarginPct,
      notes: dto.notes,
      terms: dto.terms,
    } satisfies Partial<Prisma.QuotationUncheckedCreateInput>;

    const itemsData = dto.items.map((item, i) => {
      const c = costings[i];
      const t = totals.items[i];
      return {
        productId: item.productId,
        sortOrder: i,
        quantity: item.quantity,
        candleColor: item.candleColor,
        ribbonColor: item.ribbonColor,
        withFragrance: Boolean(item.withFragrance),
        fragranceSupplyId: item.withFragrance ? (item.fragranceSupplyId ?? null) : null,
        personalizationText: item.personalizationText,
        setupMinutesOverride: item.setupMinutesOverride,
        waxGramsPerUnit: c.waxGramsPerUnit,
        laborMinutesPerUnit: c.laborMinutesPerUnit,
        unitWaxCost: c.unitWaxCost,
        unitSupplyCost: c.unitSupplyCost,
        unitFragranceCost: c.unitFragranceCost,
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
      } satisfies Partial<Prisma.QuotationItemUncheckedCreateInput>;
    });

    const year = new Date().getUTCFullYear();

    const created = await this.quotationRepository.runInTransaction(async (tx) => {
      if (existingId) {
        await tx.quotation.update({ where: { id: existingId }, data: quotationData });
        await tx.quotationItem.deleteMany({ where: { quotationId: existingId } });
        await tx.quotationItem.createMany({ data: itemsData.map((i) => ({ ...i, quotationId: existingId })) });
        return { id: existingId };
      }

      const folio = await this.folioService.next('quotation', settings.quotationFolioPrefix, year, tx);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + settings.quotationValidityDays);

      const quotation = await tx.quotation.create({
        data: {
          ...quotationData,
          folio,
          issuedAt: new Date(),
          validUntil,
          publicToken: randomUUID(),
          currency: 'MXN',
          createdById: userId,
        } as Prisma.QuotationUncheckedCreateInput,
      });
      await tx.quotationItem.createMany({ data: itemsData.map((i) => ({ ...i, quotationId: quotation.id })) });
      return quotation;
    });

    return (await this.quotationRepository.findById(created.id))!;
  }
}
