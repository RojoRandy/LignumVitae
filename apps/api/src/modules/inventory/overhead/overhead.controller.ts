import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { Auth } from '../../auth/decorators/auth.decorator';
import { OverheadRepository } from './overhead.repository';
import { CloseOverheadPeriodUseCase } from './usecases/close-overhead-period.usecase';
import { ReopenOverheadPeriodUseCase } from './usecases/reopen-overhead-period.usecase';

class ClosePeriodDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2020) year: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
}

class ReopenPeriodDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2020) year: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
}

@ApiTags('Inventory')
@Auth(UserRoles.admin, UserRoles.super_user)
@Controller('overhead-periods')
export class OverheadController {
  constructor(
    private readonly overheadRepository: OverheadRepository,
    private readonly closeOverheadPeriodUseCase: CloseOverheadPeriodUseCase,
    private readonly reopenOverheadPeriodUseCase: ReopenOverheadPeriodUseCase,
  ) {}

  @Get()
  findAll() {
    return this.overheadRepository.findMany();
  }

  @Get('current-rate')
  async currentRate() {
    return this.overheadRepository.findMostRecentClosed();
  }

  @Post('close')
  close(@Body() dto: ClosePeriodDto) {
    return this.closeOverheadPeriodUseCase.execute(dto);
  }

  /** Deshace un cierre hecho por error. Solo admin/super_user (ya viene del @Auth de la clase). */
  @Post('reopen')
  reopen(@Body() dto: ReopenPeriodDto) {
    return this.reopenOverheadPeriodUseCase.execute(dto);
  }
}
