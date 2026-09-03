import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../../../common/utils/slug';
import { PackagingTypeRepository } from './packaging-type.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { CreatePackagingTypeDto, UpdatePackagingTypeDto } from './dto/create-packaging-type.dto';

@Injectable()
export class PackagingTypesService {
  constructor(private readonly repository: PackagingTypeRepository) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 50, search, onlyActive = true } = query;
    const where: Prisma.PackagingTypeWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.repository.findMany({ where, orderBy: { sortOrder: 'asc' }, ...paginate(page, limit) }),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const item = await this.repository.findById(id);
    if (!item) throw CatalogErrors.Exceptions.PACKAGING_TYPE_NOT_FOUND({ id });
    return item;
  }

  async create(dto: CreatePackagingTypeDto) {
    const created = await this.repository.create({
      name: dto.name,
      slug: slugify(dto.name),
      description: dto.description,
      packMinutes: dto.packMinutes ?? 0,
      setupMinutes: dto.setupMinutes ?? 0,
      supplyTemplate: dto.supplyTemplate?.length
        ? {
            create: dto.supplyTemplate.map((t) => ({
              supply: { connect: { id: t.supplyId } },
              quantity: t.quantity,
              unit: t.unit,
              note: t.note,
            })),
          }
        : undefined,
    });
    return created;
  }

  async update(id: number, dto: UpdatePackagingTypeDto) {
    await this.findById(id);
    const { supplyTemplate, ...rest } = dto;
    const data: Prisma.PackagingTypeUpdateInput = { ...rest };
    if (dto.name) data.slug = slugify(dto.name);
    const updated = await this.repository.update(id, data);
    if (supplyTemplate) {
      await this.repository.replaceTemplate(
        id,
        supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity, unit: t.unit, note: t.note, packagingTypeId: id })),
      );
    }
    return this.findById(id);
  }

  async deactivate(id: number) {
    await this.findById(id);
    const dependents = await this.repository.countDependents(id);
    if (dependents > 0) throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ productsUsingThisPackaging: dependents });
    return this.repository.deactivate(id);
  }
}
