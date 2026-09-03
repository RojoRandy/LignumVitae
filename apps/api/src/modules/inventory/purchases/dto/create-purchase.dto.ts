import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssetKind, PurchaseLineKind } from '@prisma/client';

export class CreatePurchaseItemDto {
  @ApiProperty({ enum: PurchaseLineKind })
  @IsEnum(PurchaseLineKind)
  kind: PurchaseLineKind;

  @ApiProperty({ example: '20 kilos de cera' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Requerido si kind=SUPPLY' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplyId?: number;

  @ApiPropertyOptional({ description: 'Si kind=ASSET y ya existe el activo (se le suma esta compra)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assetId?: number;

  @ApiPropertyOptional({ description: 'Si kind=ASSET y es un activo nuevo: su nombre' })
  @IsOptional()
  @IsString()
  assetName?: string;

  @ApiPropertyOptional({ enum: AssetKind, description: 'Si kind=ASSET y es un activo nuevo' })
  @IsOptional()
  @IsEnum(AssetKind)
  assetKind?: AssetKind;

  @ApiPropertyOptional({ description: 'Requerido si kind=EXPENSE' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expenseCategoryId?: number;

  @ApiProperty({ example: 2, description: 'Cuantos "bultos"/paquetes se compraron' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  packsQty: number;

  @ApiProperty({ example: 20000, description: 'Unidades base que trae CADA paquete' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  baseQtyPerPack: number;

  @ApiProperty({ example: 1978, description: 'Precio de CADA paquete' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerPack: number;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsDateString()
  purchasedAt: string;

  @ApiPropertyOptional({ example: 'Mercado Libre' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];
}
