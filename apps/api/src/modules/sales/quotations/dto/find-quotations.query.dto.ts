import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { QuotationStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class FindQuotationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: QuotationStatus }) @IsOptional() @IsEnum(QuotationStatus) status?: QuotationStatus;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() customerId?: number;
}
