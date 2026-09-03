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

    const affectedSupplyIds = new Set<number>();

    const purchase = await this.purchaseRepository.runInTransaction(async (tx) => {
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
        const lineTotal = lineTotals[i];
        const allocatedShipping = allocations[i] ?? 0;
        const baseQuantity = item.packsQty * item.baseQtyPerPack;
        const baseUnitCost = baseQuantity > 0 ? lineTotal / baseQuantity : 0;
        const landedUnitCost = baseQuantity > 0 ? (lineTotal + allocatedShipping) / baseQuantity : 0;

        let assetId = item.assetId;
        if (item.kind === PurchaseLineKind.ASSET && !assetId) {
          const asset = await tx.asset.create({
            data: {
              name: item.assetName ?? item.description,
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
          await tx.asset.update({
            where: { id: assetId },
            data: { quantity: { increment: Math.round(item.packsQty) }, totalCost: { increment: lineTotal } },
          });
        }

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: created.id,
            kind: item.kind,
            description: item.description,
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
              description: item.description,
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
    });

    // El costo sugerido se recalcula DESPUES de la transaccion (no bloquea
    // el registro de la compra si algo tarda) y nunca se aplica solo.
    await Promise.all([...affectedSupplyIds].map((id) => this.suppliesService.recalculateSuggestedCost(id)));

    return this.findById(purchase.id);
  }

  async deactivate(id: number) {
    const purchase = await this.findById(id);
    await this.purchaseRepository.runInTransaction(async (tx) => {
      await tx.purchase.update({ where: { id }, data: { isActive: false } });
      // Revertir los movimientos de stock que esta compra genero.
      const movements = await tx.stockMovement.findMany({ where: { refType: 'purchase_item', refId: { in: purchase.items.map((i) => i.id) } } });
      for (const movement of movements) {
        await tx.stockMovement.update({ where: { id: movement.id }, data: { isActive: false } });
        await this.supplyRepository.recalculateStock(movement.supplyId, tx);
      }
    });
    return this.findById(id);
  }
}
