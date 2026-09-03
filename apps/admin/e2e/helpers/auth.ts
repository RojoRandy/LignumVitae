// Inicia sesion como el usuario sembrado por prisma/seed.ts (mismas
// credenciales que .env: SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD), para que
// las specs no dependan de un usuario capturado a mano. Si el seed cambia,
// solo hay que actualizar el fallback de abajo o correr con las env vars
// puestas.
import type { Page } from '@playwright/test';

const USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

export const loginAsAdmin = async (page: Page) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(USERNAME);
  await page.getByLabel('Contrasena').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  // El dashboard es la ruta raiz tras iniciar sesion (ver LoginPage.tsx: navigate(from ?? '/')).
  await page.waitForURL('/');
};
