import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class MonthlyFinanceQueryDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2020) year: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
}
