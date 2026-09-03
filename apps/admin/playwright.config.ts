// Config de Playwright para el portal admin. Dos webServer (API + admin):
// la API necesita Postgres arriba (docker compose) y el seed corrido, asi
// que en CI habria que orquestar eso antes -- aqui, en desarrollo,
// reuseExistingServer hace que si ya tienes `pnpm dev` corriendo en otra
// terminal, Playwright use eso en vez de levantar un segundo proceso.
import { defineConfig, devices } from '@playwright/test';

const ADMIN_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: ADMIN_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @lignumvitae/api start:dev',
      url: API_URL,
      cwd: '../..',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'pnpm dev',
      url: ADMIN_URL,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
