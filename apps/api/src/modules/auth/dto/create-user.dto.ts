import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRoles } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'ana' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Ana Perez' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRoles, default: UserRoles.employee })
  @IsEnum(UserRoles)
  role: UserRoles = UserRoles.employee;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
