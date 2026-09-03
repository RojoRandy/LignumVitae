import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { UnitOfMeasure } from '@prisma/client';

export class CardSupplyTemplateItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() supplyId: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.0001) quantity: number;
  @ApiProperty({ enum: UnitOfMeasure }) @IsEnum(UnitOfMeasure) unit: UnitOfMeasure;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class CreateCardTypeDto {
  @ApiProperty({ example: 'Etiqueta 5x5 una cara' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) widthCm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) heightCm?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  printedSides?: number;

  @ApiPropertyOptional({ default: 15, description: 'Minutos de disenar el arte, POR PEDIDO' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  setupMinutes?: number;

  @ApiPropertyOptional({ type: [CardSupplyTemplateItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardSupplyTemplateItemDto)
  supplyTemplate?: CardSupplyTemplateItemDto[];
}

export class UpdateCardTypeDto extends PartialType(CreateCardTypeDto) {}
