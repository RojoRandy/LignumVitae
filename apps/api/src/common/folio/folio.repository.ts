import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FolioRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Incrementa el contador de folios de forma atomica con
   * INSERT ... ON CONFLICT DO UPDATE ... RETURNING, para que dos pedidos
   * creados al mismo tiempo nunca puedan sacar el mismo folio.
   */
  async nextValue(scope: string, year: number, tx: Prisma.TransactionClient = this.prisma): Promise<number> {
    const rows = await tx.$queryRaw<Array<{ value: number }>>`
      INSERT INTO sales.folio_counters (scope, year, value)
      VALUES (${scope}, ${year}, 1)
      ON CONFLICT (scope, year)
      DO UPDATE SET value = sales.folio_counters.value + 1
      RETURNING value`;
    return rows[0].value;
  }
}
