import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupplyTypeRepository } from './supply-type.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { InventoryErrors } from '../../../common/errors/inventory.errors';
import { CreateSupplyTypeDto, UpdateSupplyTypeDto } from './dto/create-supply-type.dto';

@Injectable()
export class SupplyTypesService {
  constructor(private readonly repository: SupplyTypeRepository) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 50, search, onlyActive = true } = query;
    const where: Prisma.SupplyTypeWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.repository.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], ...paginate(page, limit) }),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const item = await this.repository.findById(id);
    if (!item) throw InventoryErrors.Exceptions.SUPPLY_TYPE_NOT_FOUND({ id });
    return item;
  }

  async create(dto: CreateSupplyTypeDto) {
    return this.repository.create({
      name: dto.name,
      slug: dto.slug,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  async update(id: number, dto: UpdateSupplyTypeDto) {
    const item = await this.findById(id);
    if (item.isSystem && dto.slug !== undefined && dto.slug !== item.slug) {
      throw InventoryErrors.Exceptions.SYSTEM_ROW_PROTECTED({ id });
    }
    return this.repository.update(id, dto);
  }

  async deactivate(id: number) {
    const item = await this.findById(id);
    if (item.isSystem) throw InventoryErrors.Exceptions.SYSTEM_ROW_PROTECTED({ id });
    const dependents = await this.repository.countDependents(id);
    if (dependents > 0) throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ suppliesUsingThisType: dependents });
    return this.repository.deactivate(id);
  }
}
