import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const SETTINGS_ID = 1;

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.settings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
  }

  update(data: Prisma.SettingsUpdateInput) {
    return this.prisma.settings.update({ where: { id: SETTINGS_ID }, data });
  }
}
