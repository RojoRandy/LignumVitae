import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class SplitOrderItemPartDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) candleColor?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) fragranceSupplyId?: number;
}

export class SplitOrderItemDto {
  @ApiProperty({ type: [SplitOrderItemPartDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SplitOrderItemPartDto)
  parts: SplitOrderItemPartDto[];
}
