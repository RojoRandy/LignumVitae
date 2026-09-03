import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RegisterPaymentDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.TRANSFER }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiPropertyOptional({ description: 'Marca si este pago es el anticipo que confirma el pedido' })
  @IsOptional()
  @IsBoolean()
  isDeposit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiProperty() @IsDateString() paidAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
