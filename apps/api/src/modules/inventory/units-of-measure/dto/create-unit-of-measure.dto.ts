import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateUnitOfMeasureDto {
  @ApiProperty({ example: 'Gramo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'GRAM' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/)
  slug: string;

  @ApiProperty({ example: 'g' })
  @IsString()
  @IsNotEmpty()
  abbr: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateUnitOfMeasureDto extends PartialType(CreateUnitOfMeasureDto) {}
