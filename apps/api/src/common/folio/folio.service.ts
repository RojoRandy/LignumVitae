// Folios legibles: COT-2026-0001, PED-2026-0001... El prefijo viene de
// Settings (nunca hardcodeado) y el numero es atomico por scope+ano.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FolioRepository } from './folio.repository';

@Injectable()
export class FolioService {
  constructor(private readonly folioRepository: FolioRepository) {}

  async next(scope: string, prefix: string, year: number, tx?: Prisma.TransactionClient): Promise<string> {
    const value = await this.folioRepository.nextValue(scope, year, tx);
    return `${prefix}-${year}-${String(value).padStart(4, '0')}`;
  }
}
