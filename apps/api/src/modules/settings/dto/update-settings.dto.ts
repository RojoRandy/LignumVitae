import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { OverheadRateMode } from '@prisma/client';

export class UpdateSettingsDto {
  // --- Identidad y contacto
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessHours?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instagramUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facebookUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tiktokUrl?: string;

  // --- Operacion comercial
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minLeadTimeDays?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) depositPct?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) quotationValidityDays?: number;

  // --- Mano de obra
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) dailyWage?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24) workHoursPerDay?: number;

  // --- Produccion
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) meltBatchGrams?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) defaultWastePct?: number;

  // --- Cera y aroma
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() waxSupplyId?: number;
  @ApiPropertyOptional({ description: 'Que tipo de insumo es la cera (por id, no por slug)' })
  @IsOptional() @Type(() => Number) @IsInt() waxSupplyTypeId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) fragranceLoadPct?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fragranceSurcharge?: number;

  // --- Gastos indirectos
  @ApiPropertyOptional({ enum: OverheadRateMode }) @IsOptional() @IsIn(['DERIVED', 'FIXED']) overheadRateMode?: OverheadRateMode;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) overheadRatePerMinute?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) overheadMinSampleMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) overheadMaxDeviationPct?: number;

  // --- Precios
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) retailMarkupPct?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) wholesaleMarkupPct?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) wholesaleThresholdQty?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minMarginPct?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) roundingMultiple?: number;

  // --- Costo sugerido de insumos
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) supplyCostWindowDays?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) supplyCostMaxSamples?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) supplyCostAlertPct?: number;

  // --- Activos
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) defaultAssetUsefulLifeMonths?: number;

  // --- Textos
  @ApiPropertyOptional() @IsOptional() @IsString() quotationTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationFooterNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderPolicyText?: string;

  // --- Folios
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{2,6}$/) quotationFolioPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{2,6}$/) orderFolioPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{2,6}$/) purchaseFolioPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{2,6}$/) paymentFolioPrefix?: string;
}
