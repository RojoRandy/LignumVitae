import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { ProductKind } from '@prisma/client';
import { ProductComponentItemDto, ProductSupplyItemDto } from './create-product.dto';

export class PreviewProductCostDto {
  @ApiProperty({ enum: ProductKind, default: ProductKind.SIMPLE })
  @IsEnum(ProductKind)
  kind: ProductKind = ProductKind.SIMPLE;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  candleId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  packagingTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cardTypeId?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  extraSetupMinutes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  extraPackMinutes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  assemblyMinutes?: number;

  @ApiPropertyOptional({ type: [ProductComponentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductComponentItemDto)
  components?: ProductComponentItemDto[];

  @ApiPropertyOptional({ type: [ProductSupplyItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplyItemDto)
  additionalSupplies?: ProductSupplyItemDto[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  excludedSupplyIds?: number[];
}
