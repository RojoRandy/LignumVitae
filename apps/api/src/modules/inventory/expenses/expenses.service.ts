import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExpenseRepository } from './expense.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { InventoryErrors } from '../../../common/errors/inventory.errors';
import { CreateExpenseCategoryDto, CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

const startOfMonthUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

@Injectable()
export class ExpensesService {
  constructor(private readonly expenseRepository: ExpenseRepository) {}

  findAllCategories() {
    return this.expenseRepository.findManyCategories({ isActive: true });
  }

  async createCategory(dto: CreateExpenseCategoryDto) {
    return this.expenseRepository.createCategory(dto);
  }

  async findAll(query: PaginationQueryDto & { categoryId?: number; from?: string; to?: string }) {
    const { page = 1, limit = 20, onlyActive = true, categoryId, from, to } = query;
    const where: Prisma.ExpenseWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(from || to
        ? { incurredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.expenseRepository.findMany({ where, orderBy: { incurredAt: 'desc' }, ...paginate(page, limit) }),
      this.expenseRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(dto: CreateExpenseDto) {
    const category = await this.expenseRepository.findCategoryById(dto.categoryId);
    if (!category) throw InventoryErrors.Exceptions.EXPENSE_CATEGORY_NOT_FOUND({ id: dto.categoryId });

    const incurredAt = new Date(dto.incurredAt);
    const periodMonth = dto.periodMonth ? new Date(dto.periodMonth) : startOfMonthUtc(incurredAt);

    return this.expenseRepository.create({
      category: { connect: { id: dto.categoryId } },
      source: 'MANUAL',
      description: dto.description,
      amount: dto.amount,
      periodMonth,
      incurredAt,
    });
  }

  async update(id: number, dto: UpdateExpenseDto) {
    // Los gastos generados por compra o por depreciacion no se editan a
    // mano aqui; solo el monto y la descripcion son corregibles, y se
    // recomienda darlos de baja y recapturar si el origen cambio.
    const data: Prisma.ExpenseUpdateInput = {};
    if (dto.description) data.description = dto.description;
    if (dto.amount !== undefined) data.amount = dto.amount;
    return this.expenseRepository.update(id, data);
  }

  async deactivate(id: number) {
    return this.expenseRepository.deactivate(id);
  }
}
