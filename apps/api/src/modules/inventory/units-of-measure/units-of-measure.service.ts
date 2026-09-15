import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UnitOfMeasureRepository } from './unit-of-measure.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { InventoryErrors } from '../../../common/errors/inventory.errors';
import { CreateUnitOfMeasureDto, UpdateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';

@Injectable()
export class UnitsOfMeasureService {
  constructor(private readonly repository: UnitOfMeasureRepository) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 50, search, onlyActive = true } = query;
    const where: Prisma.UnitOfMeasureWhereInput = {
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
    if (!item) throw InventoryErrors.Exceptions.UNIT_OF_MEASURE_NOT_FOUND({ id });
    return item;
  }

  async create(dto: CreateUnitOfMeasureDto) {
    return this.repository.create({
      name: dto.name,
      slug: dto.slug,
      abbr: dto.abbr,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  async update(id: number, dto: UpdateUnitOfMeasureDto) {
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
    if (dependents > 0) throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ suppliesUsingThisUnit: dependents });
    return this.repository.deactivate(id);
  }
}
