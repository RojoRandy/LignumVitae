import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { SettingsService } from './settings.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Auth()
  @Get()
  get() {
    return this.settingsService.get();
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
