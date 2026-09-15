import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateSupplyTypeDto {
  @ApiProperty({ example: 'Cera' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'WAX' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/)
  slug: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSupplyTypeDto extends PartialType(CreateSupplyTypeDto) {}
