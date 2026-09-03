// Prisma 6 deprecó la clave "prisma" en package.json; la config vive aqui.
// El .env real esta en la RAIZ del monorepo (un solo archivo para las tres
// apps), asi que hay que cargarlo a mano antes de que Prisma lea DATABASE_URL.
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: path.resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
