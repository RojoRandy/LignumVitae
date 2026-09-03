import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyCategories(where: Prisma.ExpenseCategoryWhereInput = {}) {
    return this.prisma.expenseCategory.findMany({ where, orderBy: { name: 'asc' } });
  }

  findCategoryById(id: number) {
    return this.prisma.expenseCategory.findUnique({ where: { id } });
  }

  createCategory(data: Prisma.ExpenseCategoryCreateInput) {
    return this.prisma.expenseCategory.create({ data });
  }

  findMany(args: Prisma.ExpenseFindManyArgs) {
    return this.prisma.expense.findMany({ include: { category: true }, ...args });
  }

  count(where: Prisma.ExpenseWhereInput) {
    return this.prisma.expense.count({ where });
  }

  create(data: Prisma.ExpenseCreateInput) {
    return this.prisma.expense.create({ data });
  }

  update(id: number, data: Prisma.ExpenseUpdateInput) {
    return this.prisma.expense.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.expense.update({ where: { id }, data: { isActive: false } });
  }
}
