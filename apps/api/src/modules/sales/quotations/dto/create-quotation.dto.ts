import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AdjustmentType } from '@lignumvitae/types';

/** Dato libre de un insumo marcado "Indicar en cotizacion"; label copiado al capturar. */
export class ItemExtraFieldDto {
  @ApiProperty() @Type(() => Number) @IsInt() supplyId: number;
  @ApiProperty() @IsString() @MaxLength(60) label: string;
  @ApiProperty() @IsString() @MaxLength(60) value: string;
}

export class CreateQuotationItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() productId: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() candleColor?: string;
  @ApiPropertyOptional({ description: 'Legacy: ya no se captura, se conserva al duplicar' }) @IsOptional() @IsString() ribbonColor?: string;
  @ApiPropertyOptional({ type: [ItemExtraFieldDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ItemExtraFieldDto)
  extraFields?: ItemExtraFieldDto[];
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

  @ApiPropertyOptional({ description: 'Solicitud web de la que sale esta cotizacion; queda CONVERTED en la misma transaccion' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quoteRequestId?: number;
}

// Una cotizacion ya creada no puede "volver a salir" de una solicitud.
export class UpdateQuotationDto extends PartialType(OmitType(CreateQuotationDto, ['quoteRequestId'] as const)) {
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
