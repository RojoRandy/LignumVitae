// Confirma que el <select> nativo del navegador desaparecio de la app: la
// queja original era que unas vistas usaban el Select propio y otras el
// nativo del navegador, lo cual se veia y se comportaba distinto. Barre
// las rutas principales y, en las que tienen dialogo de alta con un
// selector, lo abre para revisar tambien el contenido del formulario (que
// es justo donde vivian los <select> nativos).
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

const LIST_ROUTES = [
  '/',
  '/productos',
  '/velas',
  '/categorias',
  '/empaques',
  '/tarjetas',
  '/insumos',
  '/compras',
  '/activos',
  '/gastos',
  '/cierre-mensual',
  '/usuarios',
  '/configuracion',
];

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

for (const route of LIST_ROUTES) {
  test(`sin <select> nativo en ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('select')).toHaveCount(0);
  });
}

test('el dialogo de alta de Activos no usa <select> nativo (selector de Tipo)', async ({ page }) => {
  await page.goto('/activos');
  await page.getByRole('button', { name: 'Nuevo activo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('select')).toHaveCount(0);
  // El selector de Tipo es el Select propio: se abre como popover, no como
  // el desplegable nativo del SO.
  await page.getByLabel('Tipo').click();
  await expect(page.getByRole('option', { name: 'Herramienta' })).toBeVisible();
});

test('el dialogo de alta de Insumos no usa <select> nativo (Tipo y Unidad)', async ({ page }) => {
  await page.goto('/insumos');
  await page.getByRole('button', { name: 'Nuevo insumo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('select')).toHaveCount(0);
});

test('el dialogo de alta de Usuarios no usa <select> nativo (Rol)', async ({ page }) => {
  await page.goto('/usuarios');
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('select')).toHaveCount(0);
  await page.getByLabel('Rol').click();
  await expect(page.getByRole('option', { name: 'Administradora' })).toBeVisible();
});
