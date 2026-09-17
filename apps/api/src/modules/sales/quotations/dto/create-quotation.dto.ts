import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AdjustmentType } from '@lignumvitae/types';

export class CreateQuotationItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() productId: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() candleColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ribbonColor?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() withFragrance?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() fragranceSupplyId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() personalizationText?: string;
  @ApiPropertyOptional({ description: '0 = el cliente reutiliza el diseno, no se cobra' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  setupMinutesOverride?: number;
  @ApiPropertyOptional({ description: 'Precio manual de este renglon; se valida contra el piso de margen' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPriceOverride?: number;
}

export class CreateQuotationDto {
  @ApiProperty() @Type(() => Number) @IsInt() customerId: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() eventDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() discountEnabled?: boolean;
  @ApiPropertyOptional({ enum: AdjustmentType, default: AdjustmentType.PERCENTAGE })
  @IsOptional()
  @IsEnum(AdjustmentType)
  discountType?: AdjustmentType;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discountValue?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) shippingCost?: number;
  @ApiProperty({ type: [CreateQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];
}

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {
  // items sigue obligatorio en un update: no tiene sentido "actualizar
  // parcialmente" la lista de renglones, siempre se manda la lista completa
  // vigente (igual que hace ProductWizardPage con supplyTemplate).
  @ApiProperty({ type: [CreateQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  declare items: CreateQuotationItemDto[];
}
