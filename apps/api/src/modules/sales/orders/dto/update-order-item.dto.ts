import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { ItemExtraFieldDto } from '../../quotations/dto/create-quotation.dto';

export class UpdateOrderItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) candleColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) ribbonColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) personalizationText?: string;
  @ApiPropertyOptional({ type: [ItemExtraFieldDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ItemExtraFieldDto)
  extraFields?: ItemExtraFieldDto[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) fragranceSupplyId?: number;
}
