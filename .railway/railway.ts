import { defineRailway, github, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const LignumVitae = github("RojoRandy/LignumVitae", { checkSuites: false });

  const postgresDatabase = postgres("postgres", { region: "us-west2" });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 5000 });
  const _lignumvitaeapi = service("@lignumvitae/api", {
    source: LignumVitae,
    build: "pnpm install --frozen-lockfile && pnpm --filter @lignumvitae/types build && pnpm --filter @lignumvitae/api exec prisma generate && pnpm --filter @lignumvitae/api build && pnpm --filter @lignumvitae/api exec puppeteer browsers install chrome && test -f apps/api/dist/main.js",
    start: "pnpm --filter @lignumvitae/api exec prisma migrate deploy && pnpm --filter @lignumvitae/api start:prod",
    replicas: { "us-west2": 1 },
    networking: { privateNetworkEndpoint: "lignumvitaeapi", customDomains: { "api.lignumvitae.com.mx": {} } },
    // Sin volumen: las imagenes de producto ya se suben a S3
    // (STORAGE_DRIVER=s3), no a disco local. El volumen "api-uploads" que
    // existia aqui se elimino a proposito -- vuelve a aparecer si corres
    // `railway config pull` sobre un proyecto donde aun no se haya borrado
    // del lado de Railway.
    env: { CORS_ORIGINS: preserve(), DATABASE_URL: preserve(), JWT_EXPIRATION: preserve(), JWT_SECRET: preserve(), NODE_ENV: preserve(), PUBLIC_SITE_URL: preserve(), PUPPETEER_CACHE_DIR: "/app/.cache/puppeteer", STORAGE_DRIVER: preserve(), UPLOADS_DIR: preserve(), S3_ACCESS_KEY_ID: preserve(), S3_BUCKET: preserve(), S3_KEY_PREFIX: preserve(), S3_REGION: preserve(), S3_SECRET_ACCESS_KEY: preserve() },
  });
  const _lignumvitaeadmin = service("@lignumvitae/admin", {
    source: LignumVitae,
    build: "pnpm install --frozen-lockfile && pnpm --filter @lignumvitae/types build && pnpm --filter @lignumvitae/admin build",
    start: "pnpm --filter @lignumvitae/admin start",
    replicas: { "us-west2": 1 },
    networking: { privateNetworkEndpoint: "lignumvitaeadmin", customDomains: { "admin.lignumvitae.com.mx": {} } },
    env: { PUBLIC_API_URL: preserve(), VITE_API_URL: preserve(), VITE_PUBLIC_SITE_URL: preserve() },
  });

  // Astro SSR (adapter node standalone): lee PORT de Railway y escucha en
  // 0.0.0.0 (server.host en astro.config.mjs). PUBLIC_API_URL se inlinea al
  // compilar, asi que tiene que existir tambien en tiempo de build.
  const _lignumvitaelanding = service("@lignumvitae/landing", {
    source: LignumVitae,
    build: "pnpm install --frozen-lockfile && pnpm --filter @lignumvitae/landing build",
    start: "pnpm --filter @lignumvitae/landing start",
    replicas: { "us-west2": 1 },
    networking: { privateNetworkEndpoint: "lignumvitaelanding", customDomains: { "lignumvitae.com.mx": {} } },
    env: { PUBLIC_API_URL: preserve() },
  });

  return project("Lignum Vitae", {
    resources: [_lignumvitaeapi, _lignumvitaeadmin, _lignumvitaelanding, postgresDatabase, postgresVolume],
  });
});
