import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DismissQuoteRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
