import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MEXICAN_PHONE_REGEX } from '../../../common/utils/regex';

export class QuoteExtraFieldInputDto {
  @ApiProperty() @Type(() => Number) @IsInt() supplyId: number;
  @ApiProperty() @IsString() @MaxLength(60) value: string;
}

export class CreateQuoteRequestItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() productId: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(5000) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) candleColor?: string;
  @ApiPropertyOptional({ type: [QuoteExtraFieldInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuoteExtraFieldInputDto)
  extraFields?: QuoteExtraFieldInputDto[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() withFragrance?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() fragranceSupplyId?: number;
}

export class CreateQuoteRequestDto {
  @ApiProperty() @IsString() @Length(2, 120) fullName: string;

  @ApiProperty({ example: '6181234567' })
  @IsString()
  @Matches(MEXICAN_PHONE_REGEX, { message: 'El WhatsApp debe tener exactamente 10 digitos' })
  whatsapp: string;

  @ApiProperty({ example: '2026-10-01' }) @IsDateString({ strict: true }) eventDate: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;

  @ApiProperty({ type: [CreateQuoteRequestItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteRequestItemDto)
  items: CreateQuoteRequestItemDto[];

  /** Honeypot: un humano nunca lo ve ni lo llena. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) website?: string;
}
