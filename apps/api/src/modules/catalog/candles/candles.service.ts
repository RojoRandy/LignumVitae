import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CandleRepository } from './candle.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { slugify } from '../../../common/utils/slug';
import { CreateCandleDto, UpdateCandleDto } from './dto/create-candle.dto';

@Injectable()
export class CandlesService {
  constructor(private readonly candleRepository: CandleRepository) {}

  async findAll(query: PaginationQueryDto & { categoryId?: number }) {
    const { page = 1, limit = 50, search, onlyActive = true, categoryId } = query;
    const where: Prisma.CandleWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.candleRepository.findMany({ where, orderBy: { name: 'asc' }, ...paginate(page, limit) }),
      this.candleRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const candle = await this.candleRepository.findById(id);
    if (!candle) throw CatalogErrors.Exceptions.CANDLE_NOT_FOUND({ id });
    return candle;
  }

  async create(dto: CreateCandleDto) {
    return this.candleRepository.create({
      name: dto.name,
      slug: slugify(dto.name),
      category: { connect: { id: dto.categoryId } },
      grams: dto.grams,
      widthCm: dto.widthCm,
      heightCm: dto.heightCm,
      wastePct: dto.wastePct ?? 0.03,
      meltMinutes: dto.meltMinutes ?? 15,
      meltBatchGrams: dto.meltBatchGrams,
      waxSupply: dto.waxSupplyId ? { connect: { id: dto.waxSupplyId } } : undefined,
      moldAsset: dto.moldAssetId ? { connect: { id: dto.moldAssetId } } : undefined,
      imageUrl: dto.imageUrl,
      supplyTemplate: dto.supplyTemplate?.length
        ? {
            create: dto.supplyTemplate.map((t) => ({
              supply: { connect: { id: t.supplyId } },
              quantity: t.quantity,
              unit: { connect: { id: t.unitId } },
              note: t.note,
            })),
          }
        : undefined,
    });
  }

  async update(id: number, dto: UpdateCandleDto) {
    await this.findById(id);
    const { categoryId, waxSupplyId, moldAssetId, supplyTemplate, ...rest } = dto;
    const data: Prisma.CandleUpdateInput = { ...rest };
    if (dto.name) data.slug = slugify(dto.name);
    if (categoryId) data.category = { connect: { id: categoryId } };
    if (waxSupplyId !== undefined) data.waxSupply = waxSupplyId ? { connect: { id: waxSupplyId } } : { disconnect: true };
    if (moldAssetId !== undefined) data.moldAsset = moldAssetId ? { connect: { id: moldAssetId } } : { disconnect: true };
    await this.candleRepository.update(id, data);
    if (supplyTemplate) {
      await this.candleRepository.replaceSupplyTemplate(
        id,
        supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity, unitId: t.unitId, note: t.note })),
      );
    }
    return this.findById(id);
  }

  async deactivate(id: number) {
    await this.findById(id);
    const dependents = await this.candleRepository.countDependents(id);
    if (dependents > 0) throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ productsUsingThisCandle: dependents });
    return this.candleRepository.deactivate(id);
  }
}
