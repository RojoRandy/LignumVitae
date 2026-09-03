// Unico wrapper de PrismaClient del proyecto. Regla dura: SOLO los
// repositorios inyectan PrismaService. Un service, un use case o un
// controller que lo inyecta directo es un error de arquitectura — ver
// apps/api/CLAUDE.md.
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado a Postgres');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
