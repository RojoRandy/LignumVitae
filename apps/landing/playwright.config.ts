// Config de Playwright para el landing. API + landing requieren Postgres y seed;
// reuseExistingServer aprovecha los servidores que ya esten corriendo.
import { defineConfig, devices } from '@playwright/test';

const LANDING_URL = 'http://localhost:4321';
const API_URL = 'http://localhost:3000/api';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: LANDING_URL,
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
      url: LANDING_URL,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
