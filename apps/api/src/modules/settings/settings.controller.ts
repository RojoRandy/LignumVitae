import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { SettingsService } from './settings.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import type { Settings } from '@prisma/client';

// fragranceLoadPct esta deprecado (ver schema.prisma): se omite de la respuesta
// porque el admin reenvia lo que recibe y el DTO ya no lo acepta.
const toResponse = ({ fragranceLoadPct: _deprecated, ...settings }: Settings) => settings;

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Auth()
  @Get()
  async get() {
    return toResponse(await this.settingsService.get());
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch()
  async update(@Body() dto: UpdateSettingsDto) {
    return toResponse(await this.settingsService.update(dto));
  }
}
