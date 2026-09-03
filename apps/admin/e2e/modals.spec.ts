// Reproduce la verificacion empirica que se hizo a mano durante el
// desarrollo (con las herramientas MCP de Playwright) para el bug del
// modal que "hace un salto: aparece en la esquina superior derecha y
// despues se centra". Causa raiz: Tailwind v4 anima la propiedad CSS
// `translate` por separado de `transform`, y las keyframes viejas animaban
// `transform: translate(-50%,-50%) scale(...)` sobre un elemento que YA
// tenia `-translate-x/y-1/2` como utilidad estatica -- los dos se sumaban
// durante la animacion y solo uno sobrevivia al terminar. El arreglo
// (dialog.tsx + tokens.css) centra con flexbox y anima solo opacity/scale,
// sin transform ni translate en ningun lado.
//
// Esta prueba mide la caja real del dialogo en cada frame de la animacion,
// no solo al principio y al final: el bug viejo se notaba durante TODA la
// animacion, no en un instante puntual.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test('el dialogo de alta permanece centrado durante toda la animacion de apertura', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/activos');
  await page.getByRole('button', { name: 'Nuevo activo' }).click();

  const samples = await page.evaluate(async () => {
    const results: { leftGap: number; rightGap: number; topGap: number; bottomGap: number }[] = [];
    const deadline = performance.now() + 400;
    while (performance.now() < deadline) {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const rect = dialog.getBoundingClientRect();
        if (rect.width > 0) {
          results.push({
            leftGap: rect.left,
            rightGap: window.innerWidth - rect.right,
            topGap: rect.top,
            bottomGap: window.innerHeight - rect.bottom,
          });
        }
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return results;
  });

  // Suficientes frames capturados como para que la prueba sea significativa.
  expect(samples.length).toBeGreaterThan(3);

  for (const sample of samples) {
    // Centrado horizontal y vertical: el margen izquierdo debe ser
    // (aprox) igual al derecho, y el de arriba igual al de abajo, EN
    // CADA frame -- no solo al final.
    expect(Math.abs(sample.leftGap - sample.rightGap)).toBeLessThan(2);
    expect(Math.abs(sample.topGap - sample.bottomGap)).toBeLessThan(2);
  }
});

test('la ventana de confirmacion (useConfirm) tambien queda centrada, sin salto', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/activos');

  // Crea un activo desechable para poder disparar su confirmacion de baja
  // (useConfirm reusa Dialog/DialogContent, ver confirm-dialog.tsx).
  await page.getByRole('button', { name: 'Nuevo activo' }).click();
  await page.getByLabel('Nombre', { exact: false }).fill(`Molde e2e ${Date.now()}`);
  await page.getByLabel('Costo unitario', { exact: false }).fill('100');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: 'Retirar' }).first().click();

  const samples = await page.evaluate(async () => {
    const results: { leftGap: number; rightGap: number; topGap: number; bottomGap: number }[] = [];
    const deadline = performance.now() + 400;
    while (performance.now() < deadline) {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const rect = dialog.getBoundingClientRect();
        if (rect.width > 0) {
          results.push({
            leftGap: rect.left,
            rightGap: window.innerWidth - rect.right,
            topGap: rect.top,
            bottomGap: window.innerHeight - rect.bottom,
          });
        }
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return results;
  });

  expect(samples.length).toBeGreaterThan(3);
  for (const sample of samples) {
    expect(Math.abs(sample.leftGap - sample.rightGap)).toBeLessThan(2);
    expect(Math.abs(sample.topGap - sample.bottomGap)).toBeLessThan(2);
  }

  // Limpieza: cancela la baja para no dejar el activo retirado a medias.
  await page.getByRole('button', { name: 'Cancelar' }).click();
});
