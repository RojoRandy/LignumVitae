import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty() @IsString() @IsNotEmpty() fullName: string;
  // Hasta aqui el telefono no se validaba en NINGUNA capa y "asdf" entraba
  // tal cual. Diez digitos, sin espacios ni guiones: es el formato con el
  // que se marca en Mexico y el unico que se captura en este negocio.
  @ApiProperty({ example: '3312345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'El telefono debe tener exactamente 10 digitos' })
  phone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
