import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CardTypeRepository } from './card-type.repository';
import { slugify } from '../../../common/utils/slug';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { CreateCardTypeDto, UpdateCardTypeDto } from './dto/create-card-type.dto';

@Injectable()
export class CardTypesService {
  constructor(private readonly repository: CardTypeRepository) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 50, search, onlyActive = true } = query;
    const where: Prisma.CardTypeWhereInput = {
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
    if (!item) throw CatalogErrors.Exceptions.CARD_TYPE_NOT_FOUND({ id });
    return item;
  }

  async create(dto: CreateCardTypeDto) {
    return this.repository.create({
      name: dto.name,
      slug: slugify(dto.name),
      description: dto.description,
      widthCm: dto.widthCm,
      heightCm: dto.heightCm,
      printedSides: dto.printedSides ?? 1,
      setupMinutes: dto.setupMinutes ?? 15,
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

  async update(id: number, dto: UpdateCardTypeDto) {
    await this.findById(id);
    const { supplyTemplate, ...rest } = dto;
    const updated = await this.repository.update(id, rest as Prisma.CardTypeUpdateInput);
    if (supplyTemplate) {
      await this.repository.replaceTemplate(
        id,
        supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity, unitId: t.unitId, note: t.note, cardTypeId: id })),
      );
    }
    return this.findById(id);
  }

  async deactivate(id: number) {
    await this.findById(id);
    const dependents = await this.repository.countDependents(id);
    if (dependents > 0) throw CatalogErrors.Exceptions.HAS_DEPENDENTS({ productsUsingThisCard: dependents });
    return this.repository.deactivate(id);
  }
}
