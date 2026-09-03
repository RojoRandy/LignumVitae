import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { HEX_COLOR_REGEX } from '../../../../common/utils/regex';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Animalitos' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '#8A9A5B', description: 'Color para diferenciar la categoria' })
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'colorHex debe ser un hex de 6 digitos, ej. #8A9A5B' })
  colorHex: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisibleOnLanding?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
