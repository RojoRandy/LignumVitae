// Confirma que los campos que el usuario senalo como "no se para que
// sirven" ahora traen un icono de informacion que, al enfocarlo/pasarle el
// mouse, muestra la explicacion (Field.tooltip / RowField.tooltip, ver
// components/ui/field.tsx). Se prueba con teclado (foco), no solo con
// mouse, porque el Tooltip de Radix se abre en los dos casos y el foco es
// la unica via de quien no usa mouse.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('Velas: el tooltip de Capacidad de la olla explica que si afecta el costo', async ({ page }) => {
  await page.goto('/velas');
  await page.getByRole('button', { name: 'Nueva vela' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const tooltipButton = page.getByRole('button', { name: /Informacion sobre Capacidad de la olla/ });
  await expect(tooltipButton).toBeVisible();
  await tooltipButton.focus();
  await expect(page.getByText(/reemplaza el '\/30' fijo/)).toBeVisible();
});

test('Empaques: el tooltip de Minutos de armado explica que es por pedido y si afecta el precio', async ({ page }) => {
  await page.goto('/empaques');
  await page.getByRole('button', { name: 'Nuevo empaque' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const tooltipButton = page.getByRole('button', { name: /Informacion sobre Minutos de armado/ });
  await tooltipButton.focus();
  await expect(page.getByText(/se reparte entre las piezas del pedido/)).toBeVisible();
});

test('Gastos: el tooltip de Tipo explica la diferencia entre gasto indirecto y no operativo', async ({ page }) => {
  await page.goto('/gastos');
  await page.getByRole('button', { name: 'Nueva categoria' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const tooltipButton = page.getByRole('button', { name: /Informacion sobre Tipo/ });
  await tooltipButton.focus();
  await expect(page.getByText(/No operativo: se registra pero NO afecta el costo/)).toBeVisible();
  // El termino crudo en ingles ya no aparece en el texto visible al usuario.
  await expect(page.getByText('OVERHEAD', { exact: true })).toHaveCount(0);
});

test('Configuracion > Costeo: Tasa de respaldo y Ventana de compras traen tooltip', async ({ page }) => {
  await page.goto('/configuracion');
  await page.getByRole('tab', { name: 'Costeo' }).click();

  await expect(page.getByRole('button', { name: /Informacion sobre Tasa de respaldo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Informacion sobre Ventana de compras/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Informacion sobre Vida util de activos/ })).toBeVisible();

  // Los campos inertes se ocultaron de la UI (siguen en la BD, ver plan).
  await expect(page.getByLabel('Carga de esencia', { exact: false })).toHaveCount(0);
  await expect(page.getByLabel('Minutos minimos de muestra', { exact: false })).toHaveCount(0);
  await expect(page.getByLabel('Desviacion maxima permitida', { exact: false })).toHaveCount(0);
  await expect(page.getByLabel('Modo de gastos indirectos', { exact: false })).toHaveCount(0);
});

test('Configuracion > Precios: Piso de margen para overrides trae tooltip', async ({ page }) => {
  await page.goto('/configuracion');
  await page.getByRole('tab', { name: 'Precios' }).click();
  await expect(page.getByRole('button', { name: /Informacion sobre Piso de margen/ })).toBeVisible();
});

test('Cierre mensual: explica que hace el cierre y por que hoy siempre da Respaldo', async ({ page }) => {
  await page.goto('/cierre-mensual');
  await expect(page.getByText(/tasa por minuto que usa el costeo/)).toBeVisible();
  // Responde directamente la pregunta del usuario: por que el cierre
  // siempre muestra "Respaldo" en vez de "Derivada".
  await expect(page.getByText(/minutos productivos siempre dan 0/)).toBeVisible();
});
