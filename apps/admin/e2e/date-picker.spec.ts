// Verifica clicks normales en la navegacion y el salto directo de mes y año.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('el calendario navega por mes y permite elegir mes y año', async ({ page }) => {
  await page.goto('/cotizaciones/nueva');
  const trigger = page.getByRole('button', { name: 'Sin fecha de evento', exact: true });
  await trigger.click();

  const calendar = page.getByRole('dialog');
  const grid = calendar.getByRole('grid');
  await expect(grid).toBeVisible();
  const initialMonth = await grid.getAttribute('aria-label');
  expect(initialMonth).toBeTruthy();

  await calendar.getByRole('button', { name: 'Ir al mes siguiente', exact: true }).click();
  await expect(grid).not.toHaveAttribute('aria-label', initialMonth!);
  await calendar.getByRole('button', { name: 'Ir al mes anterior', exact: true }).click();
  await expect(grid).toHaveAttribute('aria-label', initialMonth!);

  const nextYear = await page.evaluate(() => new Date().getFullYear() + 1);
  const monthSelect = calendar.getByRole('combobox', { name: 'Elegir el mes', exact: true });
  const yearSelect = calendar.getByRole('combobox', { name: 'Elegir el año', exact: true });
  await monthSelect.selectOption('11');
  await yearSelect.selectOption(String(nextYear));
  await expect(monthSelect).toHaveValue('11');
  await expect(yearSelect).toHaveValue(String(nextYear));
  await expect(grid).toHaveAttribute('aria-label', `diciembre ${nextYear}`);

  await grid.getByRole('button', { name: new RegExp(`15 de diciembre de ${nextYear}`) }).click();
  await expect(calendar).not.toBeVisible();
  await expect(page.getByRole('button', { name: /15.*dic/ })).toBeVisible();
});
