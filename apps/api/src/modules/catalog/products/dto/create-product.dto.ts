import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ProductKind } from '@prisma/client';

export class ProductSupplyItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() supplyId: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.0001) quantity: number;
  @ApiProperty() @Type(() => Number) @IsInt() unitId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ProductComponentItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() candleId: number;
  @ApiProperty({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) quantity: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Osito Chico con Listón' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @ApiProperty({ enum: ProductKind, default: ProductKind.SIMPLE })
  @IsEnum(ProductKind)
  kind: ProductKind = ProductKind.SIMPLE;

  @ApiPropertyOptional({ description: 'Requerido si kind=SIMPLE' })
  @ValidateIf((o) => o.kind === ProductKind.SIMPLE)
  @Type(() => Number)
  @IsInt()
  candleId?: number;

  @ApiPropertyOptional({ description: 'Empaque del producto (Sola, Listón, Cajita, Tul...)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  packagingTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cardTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiPropertyOptional({ default: 0, description: 'Solo para kind=BOUQUET: minutos de envolver y atar el ramo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  assemblyMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowsFragrance?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisibleOnLanding?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Aparece primero en el catalogo y en "Destacados" del dashboard' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    type: [ProductComponentItemDto],
    description: 'Requerido si kind=BOUQUET: las velas que arma el ramo',
  })
  @ValidateIf((o) => o.kind === ProductKind.BOUQUET)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductComponentItemDto)
  components?: ProductComponentItemDto[];

  @ApiPropertyOptional({
    type: [ProductSupplyItemDto],
    description:
      'Insumos ADICIONALES a los que ya aportan las plantillas de la vela, el empaque y la tarjeta (p. ej. un cascabel extra)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplyItemDto)
  additionalSupplies?: ProductSupplyItemDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class SetPriceOverrideDto {
  @ApiPropertyOptional({ description: 'null para volver a usar el precio calculado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retailPriceOverride?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wholesalePriceOverride?: number | null;
}
