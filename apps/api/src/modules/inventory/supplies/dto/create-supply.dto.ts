import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSupplyDto {
  @ApiProperty({ example: 'Celofan transparente' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  typeId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  unitId: number;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFragrance?: boolean;
}

export class UpdateSupplyDto extends PartialType(CreateSupplyDto) {}
