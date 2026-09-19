import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { QuoteRequestStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class FindQuoteRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: QuoteRequestStatus }) @IsOptional() @IsEnum(QuoteRequestStatus) status?: QuoteRequestStatus;
}
