import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SupplyType, UnitOfMeasure } from '@prisma/client';

export class CreateSupplyDto {
  @ApiProperty({ example: 'Celofan transparente' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ enum: SupplyType })
  @IsEnum(SupplyType)
  type: SupplyType;

  @ApiProperty({ enum: UnitOfMeasure })
  @IsEnum(UnitOfMeasure)
  unit: UnitOfMeasure;

  @ApiProperty({ description: 'Costo por unidad base ($/g, $/pieza, etc.)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentUnitCost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockQty?: number;

  @ApiPropertyOptional({ example: 'bulto de 20 kg' })
  @IsOptional()
  @IsString()
  defaultPackLabel?: string;

  @ApiPropertyOptional({ description: 'Cuantas unidades base trae ese "bulto"' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultBaseQtyPerPack?: number;

  @ApiPropertyOptional({ description: 'Ayuda de captura: de una unidad base salen N piezas usables' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  yieldPerBaseUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplyDto extends PartialType(CreateSupplyDto) {}
