import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { AdjustmentType } from '@lignumvitae/types';
import { CreateQuotationItemDto } from './create-quotation.dto';

/** Mismos renglones y ajustes que CreateQuotationDto, sin cliente ni fechas:
 *  alimenta el panel "en vivo" del editor sin persistir nada. */
export class PreviewQuotationTotalsDto {
  @ApiProperty({ type: [CreateQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() discountEnabled?: boolean;
  @ApiPropertyOptional({ enum: AdjustmentType, default: AdjustmentType.PERCENTAGE })
  @IsOptional()
  @IsEnum(AdjustmentType)
  discountType?: AdjustmentType;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discountValue?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) shippingCost?: number;
}
