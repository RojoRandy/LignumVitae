// Reemplaza el "=143.45/3" capturado a mano en la celda de Costo del Excel:
// aqui se registra "2 bultos x 20,000 g x $1,978" y el servidor deriva el
// costo por unidad base, con el flete prorrateado entre los renglones de
// insumo. Distingue SUPPLY (afecta costo y stock), ASSET (se amortiza, no
// entra al costo unitario del dia) y EXPENSE (gasto del mes).
import { Injectable } from '@nestjs/common';
import { Prisma, PurchaseLineKind } from '@prisma/client';
import { prorateShipping } from '@lignumvitae/types';
import { PurchaseRepository } from './purchase.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { InventoryErrors } from '../../../common/errors/inventory.errors';
import { FolioService } from '../../../common/folio/folio.service';
import { SettingsService } from '../../settings/settings.service';
import { SupplyRepository } from '../supplies/supply.repository';
import { SuppliesService } from '../supplies/supplies.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly supplyRepository: SupplyRepository,
    private readonly suppliesService: SuppliesService,
    private readonly folioService: FolioService,
    private readonly settingsService: SettingsService,
  ) {}

  async findAll(query: PaginationQueryDto & { from?: string; to?: string }) {
    const { page = 1, limit = 20, onlyActive = true, from, to } = query;
    const where: Prisma.PurchaseWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(from || to
        ? { purchasedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.purchaseRepository.findMany({ where, orderBy: { purchasedAt: 'desc' }, ...paginate(page, limit) }),
      this.purchaseRepository.count(where),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const purchase = await this.purchaseRepository.findById(id);
    if (!purchase) throw InventoryErrors.Exceptions.PURCHASE_NOT_FOUND({ id });
    return purchase;
  }

  async create(dto: CreatePurchaseDto) {
    const affectedSupplyIds = new Set<number>();
    const purchase = await this.purchaseRepository.runInTransaction((tx) => this.createWithin(tx, dto, affectedSupplyIds));

    // El costo sugerido se recalcula DESPUES de la transaccion (no bloquea
    // el registro de la compra si algo tarda) y nunca se aplica solo.
    await Promise.all([...affectedSupplyIds].map((id) => this.suppliesService.recalculateSuggestedCost(id)));

    return this.findById(purchase.id);
  }

  /**
   * El cuerpo de create(), sin transaccion propia, para que editar una compra
   * pueda cancelar la vieja y crear la corregida en UNA sola transaccion: si
   * la segunda mitad falla, la cancelacion tampoco queda escrita.
   */
  private async createWithin(
    tx: Prisma.TransactionClient,
    dto: CreatePurchaseDto,
    affectedSupplyIds: Set<number>,
  ) {
    const settings = await this.settingsService.get();
    const purchasedAt = new Date(dto.purchasedAt);
    const year = purchasedAt.getUTCFullYear();
    const shippingCost = dto.shippingCost ?? 0;

    // Lo que se calcula ANTES de la transaccion, sin tocar la base de datos.
    const lineTotals = dto.items.map((item) => item.packsQty * item.pricePerPack);
    // El flete se prorratea solo entre los renglones SUPPLY: un molde o un
    // gasto no cargan flete de insumo.
    const supplyLineTotals = dto.items.map((item, i) => (item.kind === 'SUPPLY' ? lineTotals[i] : 0));
    const allocations = prorateShipping(supplyLineTotals, shippingCost);
    const subtotal = lineTotals.reduce((a, b) => a + b, 0);
    const total = subtotal + shippingCost;

    const folio = await this.folioService.next('purchase', settings.purchaseFolioPrefix, year);

    const created = await tx.purchase.create({
        data: {
          folio,
          purchasedAt,
          platform: dto.platform,
          supplierName: dto.supplierName,
          reference: dto.reference,
          shippingCost,
          subtotal,
          total,
          notes: dto.notes,
        },
      });

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        let description = item.description || '';
        if (!description) {
          if (item.kind === PurchaseLineKind.SUPPLY && item.supplyId) {
            const supply = await tx.supply.findUniqueOrThrow({ where: { id: item.supplyId } });
            description = supply.name;
          } else if (item.kind === PurchaseLineKind.ASSET) {
            description = item.assetName || '';
          } else if (item.kind === PurchaseLineKind.EXPENSE && item.expenseCategoryId) {
            const category = await tx.expenseCategory.findUniqueOrThrow({ where: { id: item.expenseCategoryId } });
            description = category.name;
          }
          // Antes description era obligatoria y nada podia quedar sin nombre.
          // Ahora que se deriva, un renglon al que le falta ADEMAS su origen
          // (el insumo, el nombre del activo, la categoria) crearia un activo
          // llamado "" en vez de fallar. Se corta aqui, en el unico punto por
          // el que pasan los tres tipos de renglon.
          if (!description) {
            throw InventoryErrors.Exceptions.PURCHASE_ITEM_NEEDS_DESCRIPTION({ index: i, kind: item.kind });
          }
        }
        const lineTotal = lineTotals[i];
        const allocatedShipping = allocations[i] ?? 0;
        const baseQuantity = item.packsQty * item.baseQtyPerPack;
        const baseUnitCost = baseQuantity > 0 ? lineTotal / baseQuantity : 0;
        const landedUnitCost = baseQuantity > 0 ? (lineTotal + allocatedShipping) / baseQuantity : 0;

        let assetId = item.assetId;
        if (item.kind === PurchaseLineKind.ASSET && !assetId) {
          const asset = await tx.asset.create({
            data: {
              name: item.assetName ?? description,
              kind: item.assetKind ?? 'MOLD',
              acquiredAt: purchasedAt,
              quantity: Math.round(item.packsQty),
              unitCost: item.pricePerPack,
              totalCost: lineTotal,
              usefulLifeMonths: settings.defaultAssetUsefulLifeMonths,
            },
          });
          assetId = asset.id;
        } else if (item.kind === PurchaseLineKind.ASSET && assetId) {
          // Se suma a un activo existente (p. ej. comprar 3 moldes mas del mismo tipo).
          // isActive vuelve a true a proposito: al EDITAR una compra, la
          // cancelacion previa deja el activo en baja si era su unico
          // renglon, y sin esto la compra corregida le devolveria las piezas
          // a un activo que quedo invisible en el portal.
          await tx.asset.update({
            where: { id: assetId },
            data: { quantity: { increment: Math.round(item.packsQty) }, totalCost: { increment: lineTotal }, isActive: true },
          });
        }

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: created.id,
            kind: item.kind,
            description,
            supplyId: item.kind === PurchaseLineKind.SUPPLY ? item.supplyId : null,
            assetId: item.kind === PurchaseLineKind.ASSET ? assetId : null,
            expenseCategoryId: item.kind === PurchaseLineKind.EXPENSE ? item.expenseCategoryId : null,
            packsQty: item.packsQty,
            baseQtyPerPack: item.baseQtyPerPack,
            pricePerPack: item.pricePerPack,
            lineTotal,
            baseQuantity,
            baseUnitCost,
            landedUnitCost,
            allocatedShipping,
          },
        });

        if (item.kind === PurchaseLineKind.SUPPLY && item.supplyId) {
          await tx.stockMovement.create({
            data: {
              supplyId: item.supplyId,
              kind: 'PURCHASE',
              quantity: baseQuantity,
              unitCost: landedUnitCost,
              refType: 'purchase_item',
              refId: purchaseItem.id,
              occurredAt: purchasedAt,
            },
          });
          await this.supplyRepository.recalculateStock(item.supplyId, tx);
          affectedSupplyIds.add(item.supplyId);
        }

        if (item.kind === PurchaseLineKind.EXPENSE && item.expenseCategoryId) {
          const periodMonth = new Date(Date.UTC(purchasedAt.getUTCFullYear(), purchasedAt.getUTCMonth(), 1));
          await tx.expense.create({
            data: {
              categoryId: item.expenseCategoryId,
              source: 'PURCHASE',
              description,
              amount: lineTotal,
              periodMonth,
              incurredAt: purchasedAt,
              refType: 'purchase_item',
              refId: purchaseItem.id,
            },
          });
        }
      }

    return created;
  }

  /**
   * Cancelar revierte TODO lo que la compra creo, no solo el stock: hasta
   * ahora el activo comprado, el gasto del mes y el costo sugerido se
   * quedaban vivos despues de cancelar.
   */
  async deactivate(id: number) {
    const purchase = await this.findById(id);
    // Cancelar dos veces NO revierte dos veces: sin esto, un doble click
    // decrementa el activo dos veces y lo deja en negativo.
    if (!purchase.isActive) return purchase;

    const affectedSupplyIds = new Set<number>();
    await this.purchaseRepository.runInTransaction(async (tx) => {
      await this.assertPeriodOpen(tx, purchase.purchasedAt);
      await this.revertWithin(tx, purchase, affectedSupplyIds);
    });

    await Promise.all([...affectedSupplyIds].map((sid) => this.suppliesService.recalculateSuggestedCost(sid)));
    return this.findById(id);
  }

  /**
   * Editar una compra = cancelar la vieja y crear la corregida, en una sola
   * transaccion. No es un diff de renglones: recalcular el prorrateo de flete
   * y los movimientos de stock renglon por renglon contra lo que ya estaba
   * escrito es mucho mas facil de descuadrar que volver a empezar.
   *
   * La compra corregida toma folio nuevo. La cancelada se queda visible, con
   * el suyo, como rastro de la correccion.
   */
  async update(id: number, dto: CreatePurchaseDto) {
    const purchase = await this.findById(id);
    if (!purchase.isActive) throw InventoryErrors.Exceptions.PURCHASE_NOT_FOUND({ id });

    const affectedSupplyIds = new Set<number>();
    const created = await this.purchaseRepository.runInTransaction(async (tx) => {
      // Los DOS meses: el de la compra original y el de la corregida, por si
      // la edicion mueve la fecha a un mes que ya esta cerrado.
      await this.assertPeriodOpen(tx, purchase.purchasedAt);
      await this.assertPeriodOpen(tx, new Date(dto.purchasedAt));
      await this.revertWithin(tx, purchase, affectedSupplyIds);
      return this.createWithin(tx, dto, affectedSupplyIds);
    });

    await Promise.all([...affectedSupplyIds].map((sid) => this.suppliesService.recalculateSuggestedCost(sid)));
    return this.findById(created.id);
  }

  /** Deshace las cuatro escrituras de una compra: stock, gasto y activo. */
  private async revertWithin(
    tx: Prisma.TransactionClient,
    purchase: Awaited<ReturnType<PurchasesService['findById']>>,
    affectedSupplyIds: Set<number>,
  ) {
    const itemIds = purchase.items.map((i) => i.id);
    await tx.purchase.update({ where: { id: purchase.id }, data: { isActive: false } });

    // 1. Stock: los movimientos se dan de baja y stockQty se RECALCULA desde
    //    los movimientos vivos, nunca por delta.
    const movements = await tx.stockMovement.findMany({ where: { refType: 'purchase_item', refId: { in: itemIds } } });
    for (const movement of movements) {
      await tx.stockMovement.update({ where: { id: movement.id }, data: { isActive: false } });
      await this.supplyRepository.recalculateStock(movement.supplyId, tx);
      affectedSupplyIds.add(movement.supplyId);
    }

    // 2. Gasto del periodo: baja logica, para que el historico siga auditable.
    await tx.expense.updateMany({
      where: { refType: 'purchase_item', refId: { in: itemIds } },
      data: { isActive: false },
    });

    // 3. Activos: se decrementa EXACTAMENTE lo que sumo este renglon. Una sola
    //    rama cubre los dos casos, sin columna nueva: un activo creado por esta
    //    compra se queda en 0 y se da de baja (ya no le quedan renglones
    //    vivos); uno al que solo se le sumaron piezas vuelve a su numero y
    //    sigue vivo.
    for (const item of purchase.items) {
      if (item.kind !== PurchaseLineKind.ASSET || !item.assetId) continue;
      await tx.asset.update({
        where: { id: item.assetId },
        data: {
          quantity: { decrement: Math.round(Number(item.packsQty)) },
          totalCost: { decrement: item.lineTotal },
        },
      });
      const stillUsed = await tx.purchaseItem.count({
        where: { assetId: item.assetId, purchase: { isActive: true } },
      });
      if (stillUsed === 0) {
        await tx.asset.update({ where: { id: item.assetId }, data: { isActive: false } });
      }
    }
  }

  /**
   * Un mes cerrado congela su bolsa de gastos y la tasa por minuto con la que
   * ya se costearon pedidos de ese mes. Tocar una compra suya dejaria el
   * cierre mintiendo, asi que no se deja.
   */
  private async assertPeriodOpen(tx: Prisma.TransactionClient, date: Date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const period = await tx.overheadPeriod.findUnique({ where: { year_month: { year, month } } });
    if (period?.closedAt) {
      throw InventoryErrors.Exceptions.PERIOD_CLOSED({ year, month });
    }
  }
}
