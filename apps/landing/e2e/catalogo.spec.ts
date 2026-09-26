import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

function visibleCategories(page: Page) {
  return page.locator('.product-card:not([hidden])').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-category')),
  );
}

async function expectCategory(page: Page, slug: string) {
  await expect.poll(async () => {
    const categories = await visibleCategories(page);
    return categories.length > 0 && categories.every((category) => category === slug);
  }).toBe(true);
}

test('el catálogo no muestra chips ni navegación de categorías', async ({ page }) => {
  await page.goto('/catalogo');

  await expect(page.locator('[data-category-chip]')).toHaveCount(0);
  await expect(page.locator('nav[aria-label="Categorías del catálogo"]')).toHaveCount(0);
});

test('el enlace directo a flores preselecciona la categoría', async ({ page }) => {
  await page.goto('/catalogo#flores');

  await expect(page.locator('input[data-filter-category][value="flores"]')).toBeChecked();
  await expectCategory(page, 'flores');
});

test('la categoría de la home abre el catálogo filtrado', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('a[href^="/catalogo#"]').first();
  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();
  const hash = href!.slice(href!.indexOf('#'));
  const slug = decodeURIComponent(hash.slice(1));

  await link.click();

  await expect(page).toHaveURL((url) => url.pathname === '/catalogo' && url.hash === hash);
  await expect(page.locator(`input[data-filter-category][value="${slug}"]`)).toBeChecked();
  await expectCategory(page, slug);
});

test('el checkbox de categoría activa y desactiva el filtro', async ({ page }) => {
  await page.goto('/catalogo');
  const total = await page.locator('.product-card').count();
  const checkbox = page.locator('input[data-filter-category]').first();
  const slug = await checkbox.inputValue();
  expect(slug).toBeTruthy();

  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expectCategory(page, slug!);

  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  await expect(page.locator('.product-card:not([hidden])')).toHaveCount(total);
});

test('la categoría limita las facetas de molde y empaque', async ({ page }) => {
  await page.goto('/catalogo');
  const checkbox = page.locator('input[data-filter-category]').first();
  const slug = await checkbox.inputValue();
  expect(slug).toBeTruthy();

  await checkbox.check();
  await expect(checkbox).toBeChecked();

  const labels = page.locator('label[data-facet-categories]');
  expect(await labels.count()).toBeGreaterThan(0);
  for (const label of await labels.all()) {
    const categories = (await label.getAttribute('data-facet-categories'))!.split(',');
    if (categories.includes(slug!)) {
      await expect(label).toBeVisible();
    } else {
      await expect(label).toBeHidden();
    }
  }
});

test('categoría y molde se combinan para filtrar las cards', async ({ page }) => {
  await page.goto('/catalogo');
  const checkbox = page.locator('input[data-filter-category]').first();
  const slug = await checkbox.inputValue();
  expect(slug).toBeTruthy();
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  const candle = page.locator('label[data-facet-categories]:visible input[data-filter-candle]').first();
  const mold = await candle.inputValue();
  await candle.check();

  await expect.poll(() => page.locator('.product-card:not([hidden])').evaluateAll(
    (cards, filter) => cards.length > 0 && cards.every((card) =>
      card.getAttribute('data-category') === filter.slug
      && (card.getAttribute('data-candles') ?? '').split(',').includes(filter.mold),
    ),
    { slug, mold },
  )).toBe(true);
});

test('limpiar filtros restaura todas las cards y oculta los botones', async ({ page }) => {
  await page.goto('/catalogo');
  const total = await page.locator('.product-card').count();
  const checkbox = page.locator('input[data-filter-category]').first();
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await page.locator('[data-clear-filters]:visible').first().click();

  await expect(page.locator('.product-card:not([hidden])')).toHaveCount(total);
  await expect(page.locator('[data-clear-filters]:visible')).toHaveCount(0);
  await expect(page.locator('input[data-filter-category]:checked')).toHaveCount(0);
});

test('un hash malformado conserva el catálogo completo sin errores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/catalogo#%E0');

  const total = await page.locator('.product-card').count();
  expect(total).toBeGreaterThan(0);
  await expect(page.locator('.product-card:not([hidden])')).toHaveCount(total);
  await expect(page.locator('input[data-filter-category]:checked')).toHaveCount(0);
  expect(errors).toEqual([]);
});

interface Category {
  products: { slug: string; isFeatured: boolean }[];
}

test('muestra un solo grid con todos los productos', async ({ page, request }) => {
  const res = await request.get('http://localhost:3000/api/public/catalog');
  expect(res.ok()).toBe(true);
  const { data: categories }: { data: Category[] } = await res.json();
  const total = categories.reduce((count, category) => count + category.products.length, 0);

  await page.goto('/catalogo');

  await expect(page.locator('.product-card')).toHaveCount(total);
  await expect(page.locator('.catalog-results > .grid')).toHaveCount(1);
  await expect(page.locator('.catalog-results > .grid > .product-card')).toHaveCount(total);
  await expect(page.locator('[data-category-section]')).toHaveCount(0);
  await expect(page.locator('.catalog-results h2')).toHaveCount(0);
});

test('los destacados aparecen primero', async ({ page, request }) => {
  const res = await request.get('http://localhost:3000/api/public/catalog');
  expect(res.ok()).toBe(true);
  const { data: categories }: { data: Category[] } = await res.json();
  const featured = categories.flatMap((category) => category.products).filter((product) => product.isFeatured);
  test.skip(featured.length === 0, 'El catálogo no tiene productos destacados');

  await page.goto('/catalogo');

  const slugs = await page.locator('.product-card').evaluateAll((cards, count) =>
    cards.slice(0, count).map((card) => decodeURIComponent(card.getAttribute('href')!.replace(/^\/producto\//, ''))),
    featured.length,
  );
  expect(slugs).toHaveLength(featured.length);
  expect(new Set(slugs)).toEqual(new Set(featured.map((product) => product.slug)));
});

test('el encabezado es compacto y los productos se ven sin scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/catalogo');

  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeVisible();
  await expect(page.getByText('Encuentra las velas que acompañarán tu celebración.')).toHaveCount(0);
  await expect(page.locator('.product-card').first()).toBeInViewport();
});

test('la búsqueda filtra por nombre sin importar acentos ni mayúsculas', async ({ page }) => {
  await page.goto('/catalogo');
  const name = await page.locator('.product-card h3').first().textContent();
  const word = name?.match(/\p{L}{4,}/u)?.[0];
  expect(word).toBeTruthy();
  const query = word!.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();

  await page.locator('#catalog-search').fill(query);

  await expect.poll(async () => {
    const names = await page.locator('.product-card:visible h3').allTextContents();
    return names.length > 0 && names.every((name) =>
      name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(query.toLowerCase()),
    );
  }).toBe(true);
});

test('una búsqueda sin coincidencias muestra el estado vacío y limpiar la restaura', async ({ page }) => {
  await page.goto('/catalogo');
  const total = await page.locator('.product-card').count();
  expect(total).toBeGreaterThan(0);
  const search = page.locator('#catalog-search');

  await search.fill('zzzz-no-existe');

  await expect(page.locator('.product-card:visible')).toHaveCount(0);
  await expect(page.locator('#catalog-empty')).toBeVisible();
  await page.locator('[data-clear-filters]:visible').first().click();
  await expect(search).toHaveValue('');
  await expect(page.locator('.product-card:visible')).toHaveCount(total);
  await expect(page.locator('#catalog-empty')).toBeHidden();
});

test('categoría y búsqueda se combinan', async ({ page }) => {
  await page.goto('/catalogo');
  const checkbox = page.locator('input[data-filter-category]').first();
  const slug = await checkbox.inputValue();
  expect(slug).toBeTruthy();
  await checkbox.check();
  await expectCategory(page, slug!);
  const name = await page.locator('.product-card:visible h3').first().textContent();
  const word = name?.match(/\p{L}{4,}/u)?.[0];
  expect(word).toBeTruthy();
  const query = word!.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  await page.locator('#catalog-search').fill(query);

  await expect.poll(() => page.locator('.product-card:visible').evaluateAll(
    (cards, filter) => cards.length > 0 && cards.every((card) =>
      card.getAttribute('data-category') === filter.slug
      && (card.querySelector('h3')?.textContent ?? '').normalize('NFD')
        .replace(/\p{Diacritic}/gu, '').toLowerCase().includes(filter.query),
    ),
    { slug, query },
  )).toBe(true);
});

test.describe('móvil', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('la búsqueda es visible sin abrir los filtros', async ({ page }) => {
    await page.goto('/catalogo');

    await expect(page.locator('#catalog-search')).toBeVisible();
    await expect(page.locator('#catalog-filters-dialog')).toBeHidden();
    await expect(page.locator('#catalog-filters')).toBeHidden();
  });

  test('los filtros inician colapsados y los productos se ven', async ({ page }) => {
    await page.goto('/catalogo');

    const toggle = page.getByRole('button', { name: 'Filtros', exact: true });
    await expect(toggle).toBeVisible();
    await expect(page.locator('#catalog-filters-dialog')).toBeHidden();
    await expect(page.locator('aside #catalog-filters')).toHaveCount(1);
    expect((await toggle.innerText()).trim()).toBe('');
    await expect(page.locator('[data-filters-count]')).toBeHidden();
    await expect(page.locator('#catalog-filters')).toBeHidden();
    const search = page.locator('#catalog-search');
    await expect(search).toBeVisible();
    const searchBox = await search.boundingBox();
    const toggleBox = await toggle.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(toggleBox).not.toBeNull();
    expect(Math.abs((toggleBox!.y + toggleBox!.height / 2) - (searchBox!.y + searchBox!.height / 2))).toBeLessThanOrEqual(4);
    expect(toggleBox!.x).toBeGreaterThan(searchBox!.x);
    await expect(page.locator('.product-card').first()).toBeInViewport();
  });

  test('el botón abre el modal de filtros y Ver productos lo cierra', async ({ page }) => {
    await page.goto('/catalogo');

    const toggle = page.locator('[data-filters-toggle]');
    const dialog = page.getByRole('dialog', { name: 'Filtros' });
    const badge = page.locator('[data-filters-count]');
    await expect(badge).toBeHidden();
    await toggle.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#catalog-filters')).toHaveCount(1);
    await expect(dialog.locator('#catalog-filters')).toBeVisible();
    for (const checkbox of await dialog.getByRole('checkbox').all()) {
      await expect(checkbox).toBeVisible();
    }

    await dialog.locator('input[data-filter-candle]:visible').first().check();
    const count = await page.locator('.product-card:not([hidden])').count();
    const resultsButton = dialog.locator('[data-filters-results]');
    await expect(resultsButton).toHaveText(`Ver ${count} ${count === 1 ? 'producto' : 'productos'}`);
    await resultsButton.click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('aside #catalog-filters')).toHaveCount(1);
    await expect(page.locator('#catalog-filters')).toBeHidden();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');
    await expect(page.getByRole('button', { name: 'Filtros (1)', exact: true })).toBeVisible();
  });

  test('Limpiar en el modal quita todos los filtros y queda a la izquierda de Ver productos', async ({ page }) => {
    await page.goto('/catalogo');
    const total = await page.locator('.product-card').count();

    await page.locator('[data-filters-toggle]').click();
    const dialog = page.getByRole('dialog', { name: 'Filtros' });
    const clearAll = dialog.getByRole('button', { name: 'Limpiar', exact: true });
    const resultsButton = dialog.locator('[data-filters-results]');
    await expect(clearAll).toBeDisabled();
    const clearBox = (await clearAll.boundingBox())!;
    const resultsBox = (await resultsButton.boundingBox())!;
    expect(clearBox.x + clearBox.width).toBeLessThanOrEqual(resultsBox.x);
    expect(Math.abs((clearBox.y + clearBox.height / 2) - (resultsBox.y + resultsBox.height / 2))).toBeLessThanOrEqual(4);
    await expect(dialog.locator('[data-clear-filters]')).toBeHidden();

    await dialog.locator('input[data-filter-category]').first().check();
    await dialog.locator('input[data-filter-candle]:visible').first().check();
    await expect(clearAll).toBeEnabled();

    await clearAll.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    await expect(resultsButton).toHaveText(`Ver ${total} productos`);
    await expect(clearAll).toBeDisabled();
    await expect(page.locator('[data-filters-count]')).toBeHidden();
  });

  test('Escape y la X cierran el modal', async ({ page }) => {
    await page.goto('/catalogo');

    const toggle = page.locator('[data-filters-toggle]');
    const dialog = page.getByRole('dialog', { name: 'Filtros' });
    await toggle.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('aside #catalog-filters')).toHaveCount(1);

    await toggle.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(dialog).toBeHidden();
  });
});

test('los filtros siempre son visibles en escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/catalogo');

  await expect(page.locator('[data-filters-toggle]')).toBeHidden();
  await expect(page.locator('#catalog-search')).toBeVisible();
  await expect(page.locator('#catalog-filters')).toBeVisible();
  await expect(page.locator('#catalog-filters-dialog')).toBeHidden();
  await expect(page.locator('aside #catalog-filters')).toBeVisible();
});
