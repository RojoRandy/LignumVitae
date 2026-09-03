import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateExpenseCategoryDto, CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { FindExpensesQueryDto } from './dto/find-expenses.query.dto';

@ApiTags('Inventory')
@Auth(UserRoles.admin, UserRoles.super_user)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  findAllCategories() {
    return this.expensesService.findAllCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @Get()
  findAll(@Query() query: FindExpensesQueryDto) {
    return this.expensesService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.expensesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.deactivate(id);
  }
}
