import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PrintOrdersQueryDto {
  @ApiPropertyOptional({ example: '1,2,3' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : String(value).split(',').map(Number)))
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[];
}
