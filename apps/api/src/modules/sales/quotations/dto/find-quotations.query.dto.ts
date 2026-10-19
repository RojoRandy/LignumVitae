import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { QuotationStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class FindQuotationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: QuotationStatus, isArray: true, description: 'Uno o varios, separados por coma' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsEnum(QuotationStatus, { each: true })
  status?: QuotationStatus[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() customerId?: number;
}
