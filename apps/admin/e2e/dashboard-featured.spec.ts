import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('Dashboard: las imagenes destacadas son cuadradas y las descripciones tienen la misma altura', async ({ page }) => {
  await page.goto('/');

  const card = page.getByRole('heading', { name: 'Productos destacados', exact: true }).locator('../..');
  await expect(card).toBeVisible();
  await expect(card.getByRole('status', { name: 'Cargando' })).toBeHidden();

  const containers = card.locator('button > .aspect-square');
  const count = await containers.count();
  test.skip(count === 0, 'No hay productos destacados en la base');

  for (const image of await containers.locator('img').all()) {
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }

  const descriptionHeights: number[] = [];
  for (const container of await containers.all()) {
    await expect(container).toBeVisible();
    const imageBox = await container.boundingBox();
    expect(imageBox).not.toBeNull();
    expect(Math.abs(imageBox!.width - imageBox!.height)).toBeLessThanOrEqual(1);

    const descriptionBox = await container.locator('xpath=following-sibling::*[1]').boundingBox();
    expect(descriptionBox).not.toBeNull();
    descriptionHeights.push(descriptionBox!.height);
  }

  expect(Math.max(...descriptionHeights) - Math.min(...descriptionHeights)).toBeLessThanOrEqual(1);
});
