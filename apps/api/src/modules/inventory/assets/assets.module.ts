import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetRepository } from './asset.repository';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetRepository],
  exports: [AssetRepository],
})
export class AssetsModule {}
