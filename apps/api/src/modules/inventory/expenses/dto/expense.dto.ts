import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ExpenseKind } from '@prisma/client';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Gas' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ExpenseKind, default: ExpenseKind.OVERHEAD })
  @IsEnum(ExpenseKind)
  kind: ExpenseKind = ExpenseKind.OVERHEAD;
}

export class CreateExpenseDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @ApiProperty({ example: 'Recarga de gas del taller' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Fecha en la que realmente se hizo el gasto' })
  @IsDateString()
  incurredAt: string;

  @ApiPropertyOptional({ description: 'Mes al que se imputa (YYYY-MM-01). Default: el mes de incurredAt' })
  @IsOptional()
  @IsDateString()
  periodMonth?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
