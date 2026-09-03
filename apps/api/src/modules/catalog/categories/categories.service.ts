import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoryRepository } from './category.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { slugify } from '../../../common/utils/slug';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 50, search, onlyActive = true } = query;
    const where: Prisma.CandleCategoryWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.categoryRepository.findMany({ where, orderBy: { sortOrder: 'asc' }, ...paginate(page, limit) }),
      this.categoryRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const category = await this.categoryRepository.findById(id);
    if (!category) throw CatalogErrors.Exceptions.CATEGORY_NOT_FOUND({ id });
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    return this.categoryRepository.create({
      name: dto.name,
      slug,
      colorHex: dto.colorHex,
      description: dto.description,
      coverImageUrl: dto.coverImageUrl,
      sortOrder: dto.sortOrder ?? 0,
      isVisibleOnLanding: dto.isVisibleOnLanding ?? true,
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findById(id);
    const data: Prisma.CandleCategoryUpdateInput = { ...dto };
    if (dto.name) data.slug = slugify(dto.name);
    return this.categoryRepository.update(id, data);
  }

  async deactivate(id: number) {
    await this.findById(id);
    const dependents = await this.categoryRepository.countDependents(id);
    if (dependents > 0) throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ productsInThisCategory: dependents });
    return this.categoryRepository.deactivate(id);
  }
}
