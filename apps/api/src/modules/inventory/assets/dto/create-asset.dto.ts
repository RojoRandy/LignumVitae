import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AssetKind } from '@prisma/client';

export class CreateAssetDto {
  @ApiProperty({ example: 'Molde vela rosa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: AssetKind, default: AssetKind.MOLD })
  @IsEnum(AssetKind)
  kind: AssetKind = AssetKind.MOLD;

  @ApiProperty()
  @IsDateString()
  acquiredAt: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usefulLifeMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
