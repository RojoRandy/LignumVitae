import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssetRepository } from './asset.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { InventoryErrors } from '../../../common/errors/inventory.errors';
import { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly settingsService: SettingsService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, onlyActive = true } = query;
    const where: Prisma.AssetWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.assetRepository.findMany({ where, orderBy: { acquiredAt: 'desc' }, ...paginate(page, limit) }),
      this.assetRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const asset = await this.assetRepository.findById(id);
    if (!asset) throw InventoryErrors.Exceptions.ASSET_NOT_FOUND({ id });
    return asset;
  }

  async create(dto: CreateAssetDto) {
    const settings = await this.settingsService.get();
    const quantity = dto.quantity ?? 1;
    return this.assetRepository.create({
      name: dto.name,
      kind: dto.kind,
      acquiredAt: new Date(dto.acquiredAt),
      quantity,
      unitCost: dto.unitCost,
      totalCost: dto.unitCost * quantity,
      usefulLifeMonths: dto.usefulLifeMonths ?? settings.defaultAssetUsefulLifeMonths,
      notes: dto.notes,
    });
  }

  async update(id: number, dto: UpdateAssetDto) {
    await this.findById(id);
    return this.assetRepository.update(id, dto as Prisma.AssetUpdateInput);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.assetRepository.deactivate(id);
  }
}
