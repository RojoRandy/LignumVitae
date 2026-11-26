import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { CreateQuoteRequestItemDto } from './create-quote-request.dto';

/** Lista del cotizador para compartir por enlace: sin datos de contacto. */
export class CreateSharedQuoteDto {
  @ApiPropertyOptional({ example: '2026-10-01' }) @IsOptional() @IsDateString({ strict: true }) eventDate?: string;

  @ApiProperty({ type: [CreateQuoteRequestItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteRequestItemDto)
  items: CreateQuoteRequestItemDto[];
}
