import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { suggestSupplyUnitCost } from '@lignumvitae/types';
import { SupplyRepository } from './supply.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { InventoryErrors } from '../../../common/errors/inventory.errors';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { CreateSupplyDto, UpdateSupplyDto } from './dto/create-supply.dto';
import { SettingsService } from '../../settings/settings.service';
import { RecalculateAllProductsUseCase } from '../../catalog/products/usecases/recalculate-all-products.usecase';

@Injectable()
export class SuppliesService {
  constructor(
    private readonly supplyRepository: SupplyRepository,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => RecalculateAllProductsUseCase))
    private readonly recalculateAllProductsUseCase: RecalculateAllProductsUseCase,
  ) {}

  async findAll(query: PaginationQueryDto & { type?: string }) {
    const { page = 1, limit = 20, search, onlyActive = true, type } = query;
    const where: Prisma.SupplyWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(type ? { type: { slug: type } } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.supplyRepository.findMany({ where, orderBy: { name: 'asc' }, ...paginate(page, limit) }),
      this.supplyRepository.count(where),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const supply = await this.supplyRepository.findById(id);
    if (!supply) throw InventoryErrors.Exceptions.SUPPLY_NOT_FOUND({ id });
    return supply;
  }

  async create(dto: CreateSupplyDto) {
    return this.supplyRepository.create({
      name: dto.name,
      sku: dto.sku,
      type: { connect: { id: dto.typeId } },
      unit: { connect: { id: dto.unitId } },
      currentUnitCost: dto.currentUnitCost,
      minStockQty: dto.minStockQty ?? 0,
      defaultBaseQtyPerPack: dto.defaultBaseQtyPerPack,
      yieldPerBaseUnit: dto.yieldPerBaseUnit ?? 1,
      notes: dto.notes,
      isFragrance: dto.isFragrance ?? false,
    });
  }

  async update(id: number, dto: UpdateSupplyDto) {
    await this.findById(id);
    const { typeId, unitId, ...rest } = dto;
    return this.supplyRepository.update(id, {
      ...rest,
      ...(typeId !== undefined ? { type: { connect: { id: typeId } } } : {}),
      ...(unitId !== undefined ? { unit: { connect: { id: unitId } } } : {}),
    });
  }

  async deactivate(id: number) {
    await this.findById(id);
    const dependents = await this.supplyRepository.countProductSupplies(id);
    if (dependents > 0) {
      throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ productsUsingThisSupply: dependents });
    }
    return this.supplyRepository.deactivate(id);
  }

  /**
   * Recalcula suggestedUnitCost a partir de las compras reales recientes.
   * NUNCA se aplica solo a currentUnitCost: eso lo hace applySuggestedCost,
   * a peticion explicita del admin.
   */
  async recalculateSuggestedCost(id: number) {
    const supply = await this.findById(id);
    const settings = await this.settingsService.get();
    const sinceDate = new Date(Date.now() - settings.supplyCostWindowDays * 24 * 60 * 60 * 1000);
    const samples = await this.supplyRepository.recentPurchaseSamples(id, sinceDate, settings.supplyCostMaxSamples);

    const suggestion = suggestSupplyUnitCost({
      samples,
      asOf: new Date().toISOString(),
      windowDays: settings.supplyCostWindowDays,
      maxSamples: settings.supplyCostMaxSamples,
    });

    return this.supplyRepository.update(supply.id, {
      suggestedUnitCost: suggestion.unitCost,
      suggestedCostSampleSize: suggestion.sampleSize,
      suggestedCostComputedAt: new Date(),
    });
  }

  async applySuggestedCost(id: number) {
    const supply = await this.findById(id);
    if (supply.suggestedUnitCost === null) return supply;
    const updated = await this.supplyRepository.update(id, { currentUnitCost: supply.suggestedUnitCost });
    // Bug arreglado (D.1 del plan de UX): aplicar el costo sugerido cambiaba
    // currentUnitCost pero NINGUN producto del catalogo se recosteaba, asi
    // que los precios mostrados en Productos se quedaban obsoletos hasta
    // que alguien tocara ese producto por otra razon.
    await this.recalculateAllProductsUseCase.execute();
    return updated;
  }

  /** Insumos cuyo costo real (sugerido) se desfaso de currentUnitCost mas del umbral de Settings. */
  async findWithCostDrift() {
    const settings = await this.settingsService.get();
    const all = await this.supplyRepository.findMany({ where: { isActive: true, suggestedUnitCost: { not: null } } });
    return all
      .filter((s) => s.suggestedUnitCost !== null)
      .map((s) => {
        const current = s.currentUnitCost.toNumber();
        const suggested = s.suggestedUnitCost!.toNumber();
        const driftPct = current > 0 ? Math.abs(suggested - current) / current * 100 : 0;
        return { supply: s, driftPct };
      })
      .filter((x) => x.driftPct >= settings.supplyCostAlertPct.toNumber())
      .sort((a, b) => b.driftPct - a.driftPct);
  }

  findLowStock() {
    return this.supplyRepository.findLowStock();
  }
}
