// Prueba el bug original: los inputs numericos no se podian vaciar
// (rebotaban a 0) y aceptaban "010" sin corregirlo. NumberInput (ver
// components/ui/number-input.tsx) guarda un borrador string mientras se
// escribe y solo normaliza al salir del campo.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/activos');
  await page.getByRole('button', { name: 'Nuevo activo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('un numerico opcional se puede dejar vacio sin rebotar a 0', async ({ page }) => {
  const quantity = page.getByLabel('Cantidad');
  await expect(quantity).toHaveValue('1'); // defaultValue={1}
  await quantity.fill('');
  await quantity.blur();
  await expect(quantity).toHaveValue('');
});

test('escribir 010 y salir del campo lo normaliza a 10', async ({ page }) => {
  const unitCost = page.getByLabel('Costo unitario', { exact: false });
  await unitCost.fill('010');
  await unitCost.blur();
  await expect(unitCost).toHaveValue('10');
});

test('un numerico requerido vacio bloquea el submit (no se guarda nada nulo)', async ({ page }) => {
  await page.getByLabel('Nombre').fill('Molde de prueba e2e');
  const unitCost = page.getByLabel('Costo unitario', { exact: false });
  await unitCost.fill('50');
  await unitCost.blur();
  await unitCost.fill('');
  await unitCost.blur();

  // El input debe reportarse invalido via la Constraint Validation API
  // nativa (setCustomValidity), que es lo que de verdad bloquea el submit.
  await expect(unitCost).toHaveJSProperty('validity.valid', false);

  await page.getByRole('button', { name: 'Guardar' }).click();
  // Como el navegador bloquea el submit, el dialogo nunca se cierra.
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('un decimal con coma se acepta igual que con punto', async ({ page }) => {
  const unitCost = page.getByLabel('Costo unitario', { exact: false });
  await unitCost.fill('12,50');
  await unitCost.blur();
  await expect(unitCost).toHaveValue('12.5');
});
