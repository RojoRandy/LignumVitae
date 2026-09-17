// Verifica el rediseno del renglon de compra: la queja original era que
// los 3 numericos de cada renglon aparecian en 0 sin ninguna etiqueta que
// dijera que significaba cada uno, y que el renglon de molde (2 inputs
// arriba, 1 abajo) se veia descuadrado frente al de insumo.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/compras');
  await page.getByRole('button', { name: 'Nueva compra' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('renglon de insumo: los 3 numericos tienen etiqueta visible', async ({ page }) => {
  await page.getByRole('button', { name: '+ Insumo' }).click();
  await expect(page.getByLabel('Cantidad', { exact: false })).toBeVisible();
  // getByRole('textbox', ...) en vez de getByLabel: el mismo texto tambien
  // es el aria-label del boton de informacion junto al campo (ver
  // RowField.tooltip), asi que getByLabel resuelve a 2 elementos.
  await expect(page.getByRole('textbox', { name: /Contenido por unidad/ })).toBeVisible();
  await expect(page.getByLabel('Precio unitario', { exact: false })).toBeVisible();
});

test('renglon de molde: descripcion arriba a lo ancho, 3 numericos abajo, y se puede elegir Herramienta', async ({ page }) => {
  await page.getByRole('button', { name: '+ Molde' }).click();
  await expect(page.getByPlaceholder(/Nombre del molde\/activo/)).toBeVisible();
  await expect(page.getByLabel('Tipo', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Piezas', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Costo / pieza', { exact: false })).toBeVisible();

  // El selector de Tipo reemplaza el 'MOLD' fijo de antes: ahora se puede
  // registrar una herramienta o un equipo, no solo moldes.
  await page.getByLabel('Tipo', { exact: false }).click();
  await page.getByRole('option', { name: 'Herramienta' }).click();
  await expect(page.getByLabel('Tipo', { exact: false })).toContainText('Herramienta');
});

test('renglon de gasto: mismo diseno que insumo (categoria+descripcion arriba, numericos etiquetados abajo)', async ({ page }) => {
  await page.getByRole('button', { name: '+ Gasto' }).click();
  await expect(page.getByPlaceholder(/Descripcion \(ej\. gasolina/)).toBeVisible();
  await expect(page.getByLabel('Cantidad', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Importe unitario', { exact: false })).toBeVisible();
});
