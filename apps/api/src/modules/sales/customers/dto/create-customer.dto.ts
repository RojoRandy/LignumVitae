import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty() @IsString() @IsNotEmpty() fullName: string;
  // El telefono es opcional porque hay clientes que no lo dan.
  // Si se captura, deben ser 10 digitos, sin espacios ni guiones.
  @ApiPropertyOptional({ example: '3312345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'El telefono debe tener exactamente 10 digitos' })
  phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
