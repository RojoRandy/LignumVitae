import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateTestimonialDto {
  @ApiProperty() @IsString() @Length(1, 120) customerName: string;

  // Transcripcion del mensaje que trae la captura. Obligatorio: sin esto el
  // testimonial es invisible para un lector de pantalla (es texto dentro de
  // una imagen) y no indexa.
  @ApiProperty() @IsString() @Length(1, 500) alt: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() orderId?: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) sortOrder?: number;
}

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
