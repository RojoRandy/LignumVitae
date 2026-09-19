// Orquesta el asistente de alta: crea el producto, copia las plantillas de
// insumos de la vela/empaque/tarjeta a ProductSupply (source marcado por
// origen para poder "reaplicar desde la plantilla" despues sin perder los
// ajustes manuales), y dispara el primer calculo de costeo.
import { Injectable } from '@nestjs/common';
import { Prisma, ProductKind, SupplySource } from '@prisma/client';
import { validateMinMargin } from '@lignumvitae/types';
import { CandleRepository } from '../candles/candle.repository';
import { PackagingTypeRepository } from '../packaging-types/packaging-type.repository';
import { CardTypeRepository } from '../card-types/card-type.repository';
import { ProductRepository } from './product.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { InventoryErrors } from '../../../common/errors/inventory.errors';
import { slugify } from '../../../common/utils/slug';
import { CreateProductDto, SetPriceOverrideDto, UpdateProductDto } from './dto/create-product.dto';
import { RecalculateProductCostingUseCase } from './usecases/recalculate-product-costing.usecase';
import { SettingsService } from '../../settings/settings.service';
import { StorageService } from '../storage/storage.service';
import { SupplyRepository } from '../../inventory/supplies/supply.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly candleRepository: CandleRepository,
    private readonly packagingTypeRepository: PackagingTypeRepository,
    private readonly cardTypeRepository: CardTypeRepository,
    private readonly recalculateProductCostingUseCase: RecalculateProductCostingUseCase,
    private readonly settingsService: SettingsService,
    private readonly supplyRepository: SupplyRepository,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: PaginationQueryDto & { categoryId?: number; candleId?: number; kind?: ProductKind; needsReview?: boolean }) {
    const { page = 1, limit = 20, search, onlyActive = true, categoryId, candleId, kind, needsReview } = query;
    const where: Prisma.ProductWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(candleId !== undefined ? { OR: [{ candleId }, { components: { some: { candleId } } }] } : {}),
      ...(kind ? { kind } : {}),
      ...(needsReview !== undefined ? { needsReview } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.productRepository.findMany({ where, orderBy: { name: 'asc' }, ...paginate(page, limit) }),
      this.productRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const product = await this.productRepository.findById(id);
    if (!product) throw CatalogErrors.Exceptions.PRODUCT_NOT_FOUND({ id });
    return product;
  }

  async create(dto: CreateProductDto) {
    if (dto.kind === ProductKind.SIMPLE) {
      if (!dto.candleId) throw CatalogErrors.Exceptions.SIMPLE_PRODUCT_REQUIRES_CANDLE();
      const existing = await this.productRepository.findExistingCombination(
        dto.candleId,
        dto.packagingTypeId ?? null,
        dto.cardTypeId ?? null,
      );
      if (existing) {
        throw CatalogErrors.Exceptions.DUPLICATE_PRODUCT_COMBINATION({
          candleId: dto.candleId,
          packagingTypeId: dto.packagingTypeId,
          cardTypeId: dto.cardTypeId,
          existingProductId: existing.id,
        });
      }
    } else if (!dto.components?.length) {
      throw CatalogErrors.Exceptions.BOUQUET_REQUIRES_COMPONENTS();
    }

    const sku = await this.generateSku(dto);
    const slug = slugify(dto.name);

    const created = await this.productRepository.create({
      sku,
      name: dto.name,
      slug,
      kind: dto.kind,
      category: { connect: { id: dto.categoryId } },
      candle: dto.candleId ? { connect: { id: dto.candleId } } : undefined,
      packagingType: dto.packagingTypeId ? { connect: { id: dto.packagingTypeId } } : undefined,
      cardType: dto.cardTypeId ? { connect: { id: dto.cardTypeId } } : undefined,
      description: dto.description,
      excludedSupplyIds: dto.excludedSupplyIds,
      extraSetupMinutes: dto.extraSetupMinutes ?? 0,
      extraPackMinutes: dto.extraPackMinutes ?? 0,
      assemblyMinutes: dto.assemblyMinutes ?? 0,
      allowsFragrance: dto.allowsFragrance ?? true,
      isVisibleOnLanding: dto.isVisibleOnLanding ?? true,
      isFeatured: dto.isFeatured ?? false,
    });

    if (dto.kind === ProductKind.BOUQUET && dto.components) {
      await this.productRepository.replaceComponents(
        created.id,
        dto.components.map((c, i) => ({ candleId: c.candleId, quantity: c.quantity, sortOrder: i })),
      );
    }

    await this.applySuppliesFromTemplatesAndManual(created.id, dto);
    await this.recalculateProductCostingUseCase.execute(created.id);
    return this.findById(created.id);
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.findById(id);

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name) {
      data.name = dto.name;
      data.slug = slugify(dto.name);
    }
    if (dto.categoryId) data.category = { connect: { id: dto.categoryId } };
    if (dto.candleId !== undefined) data.candle = dto.candleId ? { connect: { id: dto.candleId } } : { disconnect: true };
    if (dto.packagingTypeId !== undefined) data.packagingType = dto.packagingTypeId ? { connect: { id: dto.packagingTypeId } } : { disconnect: true };
    if (dto.cardTypeId !== undefined) data.cardType = dto.cardTypeId ? { connect: { id: dto.cardTypeId } } : { disconnect: true };
    if (dto.excludedSupplyIds !== undefined) data.excludedSupplyIds = dto.excludedSupplyIds;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.extraSetupMinutes !== undefined) data.extraSetupMinutes = dto.extraSetupMinutes;
    if (dto.extraPackMinutes !== undefined) data.extraPackMinutes = dto.extraPackMinutes;
    if (dto.assemblyMinutes !== undefined) data.assemblyMinutes = dto.assemblyMinutes;
    if (dto.allowsFragrance !== undefined) data.allowsFragrance = dto.allowsFragrance;
    if (dto.isVisibleOnLanding !== undefined) data.isVisibleOnLanding = dto.isVisibleOnLanding;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

    await this.productRepository.update(id, data);

    if (dto.components) {
      await this.productRepository.replaceComponents(
        id,
        dto.components.map((c, i) => ({ candleId: c.candleId, quantity: c.quantity, sortOrder: i })),
      );
    }

    const shouldRecalculateSupplies =
      dto.excludedSupplyIds !== undefined ||
      dto.additionalSupplies !== undefined ||
      dto.candleId !== undefined ||
      dto.packagingTypeId !== undefined ||
      dto.cardTypeId !== undefined ||
      dto.components !== undefined;

    if (shouldRecalculateSupplies) {
      await this.applySuppliesFromTemplatesAndManual(id, {
        kind: existing.kind,
        additionalSupplies: dto.additionalSupplies !== undefined
          ? dto.additionalSupplies
          : existing.supplies.filter((s) => s.source === 'MANUAL').map((s) => ({
            supplyId: s.supplyId, quantity: s.quantity.toNumber(), unitId: s.unitId, note: s.note ?? undefined,
          })),
      } as CreateProductDto);
    }

    await this.recalculateProductCostingUseCase.execute(id);
    return this.findById(id);
  }

  /** Reaplica las plantillas vigentes (p. ej. despues de editar el empaque), conservando los adicionales manuales que se le pasen. */
  async reapplyTemplates(id: number) {
    const product = await this.findById(id);
    const manual = product.supplies.filter((s) => s.source === 'MANUAL');
    await this.applySuppliesFromTemplatesAndManual(id, {
      kind: product.kind,
      additionalSupplies: manual.map((s) => ({ supplyId: s.supplyId, quantity: s.quantity.toNumber(), unitId: s.unitId, note: s.note ?? undefined })),
    } as CreateProductDto);
    await this.recalculateProductCostingUseCase.execute(id);
    return this.findById(id);
  }

  /**
   * validateMinMargin existia en @lignumvitae/types desde el principio pero
   * nadie la llamaba: se podia fijar CUALQUIER precio manual, incluso por
   * debajo del costo, sin ningun aviso. Ahora cada override que SI viene en
   * el DTO (null explicito = "volver al sugerido", que no necesita validar)
   * se compara contra el piso de margen de Configuracion.
   */
  async setPriceOverride(id: number, dto: SetPriceOverrideDto) {
    const product = await this.findById(id);
    const settings = await this.settingsService.get();
    const unitTotalCost = product.unitTotalCost.toNumber();
    const minMarginPct = settings.minMarginPct.toNumber();

    for (const [field, price] of [
      ['retailPriceOverride', dto.retailPriceOverride],
      ['wholesalePriceOverride', dto.wholesalePriceOverride],
    ] as const) {
      if (price === null || price === undefined) continue;
      const check = validateMinMargin(price, unitTotalCost, minMarginPct);
      if (!check.ok) {
        throw CatalogErrors.Exceptions.PRICE_BELOW_MIN_MARGIN({
          field,
          price,
          marginPct: check.marginPct,
          minMarginPct,
          minPrice: check.minPrice,
        });
      }
    }

    return this.productRepository.update(id, {
      retailPriceOverride: dto.retailPriceOverride === null ? null : dto.retailPriceOverride,
      wholesalePriceOverride: dto.wholesalePriceOverride === null ? null : dto.wholesalePriceOverride,
    });
  }

  async applySuggestedPrices() {
    const products = await this.productRepository.findMany({ where: { isActive: true } });
    let applied = 0;

    for (const product of products) {
      const data: Prisma.ProductUpdateInput = {};
      // Poner null es volver al sugerido: todo el sistema lee override ?? listPrice.
      if (product.retailPriceOverride !== null && !product.retailPriceOverride.equals(product.retailListPrice)) {
        data.retailPriceOverride = null;
      }
      if (product.wholesalePriceOverride !== null && !product.wholesalePriceOverride.equals(product.wholesaleListPrice)) {
        data.wholesalePriceOverride = null;
      }
      if (Object.keys(data).length === 0) continue;

      await this.productRepository.update(product.id, data);
      applied++;
    }

    return { applied };
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.productRepository.deactivate(id);
  }

  async deletePermanently(id: number) {
    const product = await this.findById(id);
    if (product.isActive) throw CatalogErrors.Exceptions.PRODUCT_MUST_BE_INACTIVE();

    const { quotationItemsCount, orderItemsCount } = await this.productRepository.countDependents(id);
    if (quotationItemsCount + orderItemsCount > 0) {
      throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ quotationItemsCount, orderItemsCount });
    }

    for (const image of product.images) {
      await this.storageService.remove(image.url);
    }
    return this.productRepository.deletePermanently(id);
  }

  async addImage(id: number, file: Pick<Express.Multer.File, 'buffer' | 'mimetype'>, isPrimary = false) {
    const product = await this.findById(id);
    if (product.images.length >= 10) {
      throw CatalogErrors.Exceptions.PRODUCT_IMAGE_LIMIT_REACHED({ id });
    }
    const url = await this.storageService.save(file.buffer, file.mimetype);
    return this.productRepository.addImage(id, { url, isPrimary });
  }

  async removeImage(imageId: number) {
    const image = await this.productRepository.findImage(imageId);
    if (image) await this.storageService.remove(image.url);
    return this.productRepository.removeImage(imageId);
  }

  async updateImageFlags(imageId: number, data: { showInHero?: boolean; showInGallery?: boolean }) {
    const image = await this.productRepository.findImage(imageId);
    if (!image) throw CatalogErrors.Exceptions.PRODUCT_IMAGE_NOT_FOUND({ imageId });
    return this.productRepository.updateImageFlags(imageId, data);
  }

  /** Copia las plantillas de la vela, el empaque y la tarjeta a ProductSupply, mas los adicionales manuales del DTO. */
  private async applySuppliesFromTemplatesAndManual(productId: number, dto: CreateProductDto | UpdateProductDto) {
    let items: { supplyId: number; quantity: number; unitId: number; note?: string; source: SupplySource }[] = [];

    const product = await this.productRepository.findById(productId);
    if (dto.kind === ProductKind.BOUQUET) {
      const candleSupplies = new Map<number, (typeof items)[number]>();
      for (const component of product?.components ?? []) {
        for (const t of component.candle.supplyTemplate) {
          const previous = candleSupplies.get(t.supplyId);
          candleSupplies.set(t.supplyId, {
            supplyId: t.supplyId,
            quantity: (previous?.quantity ?? 0) + t.quantity.toNumber() * component.quantity,
            unitId: t.unitId,
            note: t.note ?? undefined,
            source: 'CANDLE_TEMPLATE',
          });
        }
      }
      items.push(...candleSupplies.values());
    } else {
      if (product?.candleId) {
        const candle = await this.candleRepository.findById(product.candleId);
        candle?.supplyTemplate.forEach((t) =>
          items.push({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitId: t.unitId, note: t.note ?? undefined, source: 'CANDLE_TEMPLATE' }),
        );
      }
    }
    if (product?.packagingTypeId) {
      const packaging = await this.packagingTypeRepository.findById(product.packagingTypeId);
      packaging?.supplyTemplate.forEach((t) =>
        items.push({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitId: t.unitId, note: t.note ?? undefined, source: 'PACKAGING_TEMPLATE' }),
      );
    }
    if (product?.cardTypeId) {
      const card = await this.cardTypeRepository.findById(product.cardTypeId);
      card?.supplyTemplate.forEach((t) =>
        items.push({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitId: t.unitId, note: t.note ?? undefined, source: 'CARD_TEMPLATE' }),
      );
    }

    const excludedSupplyIds = new Set(product?.excludedSupplyIds ?? []);
    items = items.filter((item) => item.source === 'MANUAL' || !excludedSupplyIds.has(item.supplyId));

    // Cual es el tipo "cera" lo dice Configuracion por ID, no el texto del
    // slug: asi el tipo se puede renombrar o borrar sin romper esto en
    // silencio. Si nadie lo ha configurado, no hay nada que rechazar.
    const { waxSupplyTypeId } = await this.settingsService.get();
    for (const s of dto.additionalSupplies ?? []) {
      const supply = await this.supplyRepository.findById(s.supplyId);
      if (waxSupplyTypeId !== null && supply?.typeId === waxSupplyTypeId) {
        throw InventoryErrors.Exceptions.SUPPLY_IS_WAX({ supplyId: s.supplyId });
      }
      items.push({ supplyId: s.supplyId, quantity: s.quantity, unitId: s.unitId, note: s.note, source: 'MANUAL' });
    }

    // Si dos fuentes traen el mismo insumo (p. ej. la vela y un adicional
    // manual repiten "colorante"), la ultima gana. Las cantidades
    // NO se suman: se reemplaza, para que el admin vea exactamente lo que
    // capturo sin sorpresas de doble conteo silencioso.
    const bySupplyId = new Map(items.map((i) => [i.supplyId, i]));

    await this.productRepository.replaceSupplies(productId, [...bySupplyId.values()]);
  }

  private async generateSku(dto: CreateProductDto): Promise<string> {
    const base = slugify(dto.name).toUpperCase().replace(/-/g, '');
    const truncated = base.slice(0, 12);
    let suffix = 0;
    // Comprueba el SKU en si, no el slug: dos nombres distintos pueden
    // compartir los primeros 12 caracteres alfanumericos (p. ej. "Osito
    // Chico Liston" y "Osito Chico con Liston Rosa") y generar el mismo
    // SKU truncado aunque sus slugs sean diferentes.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = suffix > 0 ? `${truncated}-${suffix}` : truncated;
      const existing = await this.productRepository.findBySku(candidate);
      if (!existing) return candidate;
      suffix += 1;
    }
  }
}
