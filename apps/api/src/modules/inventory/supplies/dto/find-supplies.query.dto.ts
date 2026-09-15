import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class FindSuppliesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'WAX' })
  @IsOptional()
  @IsString()
  type?: string;
}
