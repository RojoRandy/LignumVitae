import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { CreateQuotationItemDto } from '../../quotations/dto/create-quotation.dto';

/** Precio final por pieza (con aroma) que se fija a un renglon que ya estaba en el pedido. */
export class ExistingItemPriceDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) itemId: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
}

export class AddOrderItemsDto {
  @ApiProperty({ type: [CreateQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];
  @ApiPropertyOptional({ type: [ExistingItemPriceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExistingItemPriceDto)
  existingPrices?: ExistingItemPriceDto[];
}
