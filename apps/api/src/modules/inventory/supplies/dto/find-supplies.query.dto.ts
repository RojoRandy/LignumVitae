import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SupplyType } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class FindSuppliesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SupplyType })
  @IsOptional()
  @IsEnum(SupplyType)
  type?: SupplyType;
}
