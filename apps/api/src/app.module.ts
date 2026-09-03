import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { FolioModule } from './common/folio/folio.module';
import { AuthModule } from './modules/auth/auth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { PublicModule } from './modules/public/public.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Un solo .env para las tres apps del monorepo, en la raiz.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
    ServeStaticModule.forRootAsync({
      useFactory: () => [
        {
          rootPath: join(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads'),
          serveRoot: '/static',
          serveStaticOptions: { index: false, fallthrough: true },
        },
      ],
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    FolioModule,
    AuthModule,
    SettingsModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    PublicModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
