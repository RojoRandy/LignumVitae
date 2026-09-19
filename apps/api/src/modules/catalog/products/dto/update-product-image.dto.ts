import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProductImageDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showInHero?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showInGallery?: boolean;
}
