import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CandleSupplyTemplateItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() supplyId: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.0001) quantity: number;
  @ApiProperty() @Type(() => Number) @IsInt() unitId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class CreateCandleDto {
  @ApiProperty({ example: 'Osito Chico' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @ApiProperty({ example: 15, description: 'Gramos de cera de UNA pieza, sin merma' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  grams: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) widthCm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) heightCm?: number;

  @ApiPropertyOptional({ default: 0.03, description: 'Merma de vaciado, 0.03 = 3%' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wastePct?: number;

  @ApiPropertyOptional({ default: 15, description: 'Minutos de derretir y desmoldar de UN LOTE' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  meltMinutes?: number;

  @ApiPropertyOptional({ description: 'Capacidad de la olla en gramos para este molde. Vacio = usa el default de Settings' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  meltBatchGrams?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() waxSupplyId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() moldAssetId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;

  @ApiPropertyOptional({
    type: [CandleSupplyTemplateItemDto],
    description: 'Insumos propios de la vela (mecha, colorante): se repiten en todas sus variantes de empaque',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandleSupplyTemplateItemDto)
  supplyTemplate?: CandleSupplyTemplateItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCandleDto extends PartialType(CreateCandleDto) {}
