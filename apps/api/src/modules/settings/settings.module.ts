import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './repositories/settings.repository';

// Sin imports a proposito: nueve modulos dependen de que SettingsModule sea una
// hoja. SettingsService resuelve el recalculo de catalogo por ModuleRef en
// tiempo de llamada justamente para no meter aqui un ciclo (ver settings.service.ts).
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
