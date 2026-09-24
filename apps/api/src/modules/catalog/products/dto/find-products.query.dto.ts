import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional } from 'class-validator';
import { ProductKind } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class FindProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['featured', 'hero', 'gallery', 'new'] })
  @IsOptional()
  @IsIn(['featured', 'hero', 'gallery', 'new'])
  highlight?: 'featured' | 'hero' | 'gallery' | 'new';

  @ApiPropertyOptional({ enum: ['name', 'retailMargin', 'wholesaleMargin'], default: 'name' })
  @IsOptional()
  @IsIn(['name', 'retailMargin', 'wholesaleMargin'])
  sortBy?: 'name' | 'retailMargin' | 'wholesaleMargin';

  @ApiPropertyOptional({ description: 'Margen minimo de venta al menudeo en porcentaje' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRetailMarginPct?: number;

  @ApiPropertyOptional({ description: 'Margen minimo de venta al mayoreo en porcentaje' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minWholesaleMarginPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  candleId?: number;

  @ApiPropertyOptional({ enum: ProductKind })
  @IsOptional()
  @IsEnum(ProductKind)
  kind?: ProductKind;

  @ApiPropertyOptional({ description: 'Filtra los productos que el importador marco para revisar' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsReview?: boolean;
}
