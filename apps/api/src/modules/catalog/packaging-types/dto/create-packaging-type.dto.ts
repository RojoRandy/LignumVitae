import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PackagingSupplyTemplateItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() supplyId: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.0001) quantity: number;
  @ApiProperty() @Type(() => Number) @IsInt() unitId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class CreatePackagingTypeDto {
  @ApiProperty({ example: 'Celofan con Liston' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0, description: 'Minutos de empaquetar UNA pieza' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  packMinutes?: number;

  @ApiPropertyOptional({ default: 0, description: 'Minutos de diseno/armado POR PEDIDO que aporta este empaque' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  setupMinutes?: number;

  @ApiPropertyOptional({ type: [PackagingSupplyTemplateItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackagingSupplyTemplateItemDto)
  supplyTemplate?: PackagingSupplyTemplateItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePackagingTypeDto extends PartialType(CreatePackagingTypeDto) {}
