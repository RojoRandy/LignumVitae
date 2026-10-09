// Cambiar de seccion con el codigo de la pagina aun por descargar debe mostrar
// un loader DE INMEDIATO. Antes (BrowserRouter con transiciones) el URL
// cambiaba pero seguia pintada la pantalla anterior hasta que llegaba el
// chunk: "el URL dice que ya esta ahi, pero no se renderiza nada".
//
// El retraso se simula en el modulo de la pagina destino (page.route): en
// `vite dev` la primera visita a cada pagina se transforma al vuelo, y con
// la cache caliente el cambio dura ~50 ms y el problema no se ve.
import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

const DELAY_MS = 1500;
// Margen para "de inmediato": mucho menor que el retraso simulado.
const LOADER_TIMEOUT_MS = 400;

const delayModule = async (page: Page, pattern: RegExp) => {
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    await route.continue();
  });
};

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('al cambiar de seccion se ve el loader de inmediato y no la pantalla anterior', async ({ page }) => {
  await delayModule(page, /\/features\/candles\/CandlesPage\.tsx/);

  await page.goto('/productos');
  const previous = page.getByRole('heading', { name: 'Productos', exact: true });
  await expect(previous).toBeVisible();

  await page.getByRole('link', { name: 'Catalogo', exact: true }).click();

  await expect(page.getByRole('status', { name: 'Cargando' })).toBeVisible({ timeout: LOADER_TIMEOUT_MS });
  await expect(previous).toBeHidden({ timeout: LOADER_TIMEOUT_MS });

  // Y al llegar el chunk se pinta la pagina nueva.
  await expect(page.getByRole('heading', { name: 'Catalogo', exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Cargando' })).toBeHidden();
});

test('dentro de Catalogo, cambiar de pestana conserva el encabezado y solo carga el contenido', async ({ page }) => {
  await delayModule(page, /\/features\/categories\/CategoriesPage\.tsx/);

  await page.goto('/catalogo/velas');
  const header = page.getByRole('heading', { name: 'Catalogo', exact: true });
  await expect(header).toBeVisible();
  const tab = page.getByRole('link', { name: 'Categorias', exact: true });

  await tab.click();

  await expect(page.getByRole('status', { name: 'Cargando' })).toBeVisible({ timeout: LOADER_TIMEOUT_MS });
  // El marco de la seccion no desaparece mientras llega el contenido.
  await expect(header).toBeVisible();
  await expect(tab).toBeVisible();
});

const delayApi = async (page: Page, pattern: RegExp) => {
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    await route.continue();
  });
};

test('una peticion lenta muestra la barra de progreso global y se oculta al terminar', async ({ page }) => {
  await delayApi(page, /\/api\/orders\?/);

  await page.goto('/pedidos');

  // Aparece tras ~200 ms (anti-parpadeo) y mientras la API no responde.
  await expect(page.getByRole('progressbar', { name: 'Cargando datos' })).toBeVisible({ timeout: 1000 });
  await expect(page.getByRole('progressbar', { name: 'Cargando datos' })).toBeHidden({ timeout: 5000 });
});

test('el selector de cliente muestra "Cargando..." y se habilita cuando llegan las opciones', async ({ page }) => {
  await delayApi(page, /\/api\/customers\?/);

  await page.goto('/cotizaciones/nueva');

  const trigger = page.getByRole('button', { name: 'Cargando...' }).first();
  await expect(trigger).toBeVisible({ timeout: 2000 });
  await expect(trigger).toBeDisabled();

  await expect(page.getByRole('button', { name: 'Elegir cliente...' })).toBeEnabled({ timeout: 5000 });
});
