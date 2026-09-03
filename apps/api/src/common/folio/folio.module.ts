import { Global, Module } from '@nestjs/common';
import { FolioService } from './folio.service';
import { FolioRepository } from './folio.repository';

@Global()
@Module({
  providers: [FolioService, FolioRepository],
  exports: [FolioService],
})
export class FolioModule {}
