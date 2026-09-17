// Fase 3 (Ventas): cubre el camino feliz completo -- crear una cotizacion
// con un renglon y ver el total en vivo, y aceptar una cotizacion enviada
// para crear un pedido cuyo anticipo lo confirma solo. La cotizacion de la
// segunda prueba se siembra por API (mas rapido que re-manejar el
// formulario) siguiendo el mismo criterio que loginAsAdmin: no depender de
// datos capturados a mano.
import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

const API_URL = 'http://localhost:3000/api';
const USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

const apiLogin = async (request: APIRequestContext): Promise<string> => {
  const res = await request.post(`${API_URL}/auth/sign-in`, { data: { username: USERNAME, password: PASSWORD } });
  const body = await res.json();
  return body.data.accessToken as string;
};

// La base ya no trae catalogo precargado (ver Plans/.../plan.md, bloque C):
// cada prueba que necesita un producto lo siembra por API, igual que ya
// hacia con el cliente.
const seedCatalogProduct = async (request: APIRequestContext, token: string) => {
  const auth = { Authorization: `Bearer ${token}` };
  const categoryRes = await request.post(`${API_URL}/categories`, {
    headers: auth,
    data: { name: `E2E Cat ${Date.now()}`, colorHex: '#8A9A5B' },
  });
  const category = (await categoryRes.json()).data;

  const candleRes = await request.post(`${API_URL}/candles`, {
    headers: auth,
    data: { name: `E2E Candle ${Date.now()}`, categoryId: category.id, grams: 100 },
  });
  const candle = (await candleRes.json()).data;

  const productRes = await request.post(`${API_URL}/products`, {
    headers: auth,
    data: { name: `E2E Product ${Date.now()}`, categoryId: category.id, kind: 'SIMPLE', candleId: candle.id },
  });
  return (await productRes.json()).data;
};

const seedSentQuotation = async (request: APIRequestContext, token: string) => {
  const auth = { Authorization: `Bearer ${token}` };
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: auth,
    data: { fullName: `E2E Sales ${Date.now()}`, phone: '5551234567' },
  });
  const customer = (await customerRes.json()).data;

  const product = await seedCatalogProduct(request, token);

  const quotationRes = await request.post(`${API_URL}/quotations`, {
    headers: auth,
    data: { customerId: customer.id, items: [{ productId: product.id, quantity: 3 }] },
  });
  const quotation = (await quotationRes.json()).data;

  await request.post(`${API_URL}/quotations/${quotation.id}/send`, { headers: auth });

  return { customer, quotation };
};

test('crea una cotizacion, agrega un renglon y ve el total calculado', async ({ page, request }) => {
  const token = await apiLogin(request);
  await request.post(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { fullName: `E2E Form ${Date.now()}`, phone: '5559876543' },
  });
  await seedCatalogProduct(request, token);

  await loginAsAdmin(page);
  await page.goto('/cotizaciones/nueva');

  await page.getByRole('button', { name: 'Elegir cliente...' }).click();
  await page.getByRole('option').first().click();

  await page.getByRole('button', { name: 'Agregar renglon' }).click();
  await page.getByRole('button', { name: 'Elegir producto...' }).click();
  await page.getByRole('option').first().click();

  // El panel de totales arranca en "Agrega renglones..." y pasa a mostrar
  // el Total en cuanto el preview del servidor responde.
  await expect(page.getByText('Vista previa')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Total', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page).toHaveURL(/\/cotizaciones\/\d+$/);
  await expect(page.getByText(/COT-\d{4}-\d{4}/)).toBeVisible();
});

test('acepta una cotizacion enviada y registra un abono que confirma el pedido', async ({ page, request }) => {
  const token = await apiLogin(request);
  const { quotation } = await seedSentQuotation(request, token);

  await loginAsAdmin(page);
  await page.goto(`/cotizaciones/${quotation.id}`);
  await expect(page.getByText('Enviada')).toBeVisible();

  await page.getByRole('button', { name: 'Aceptar y crear pedido' }).click();
  await page.getByRole('button', { name: 'Aceptar y crear pedido' }).last().click();

  await expect(page).toHaveURL(/\/pedidos\/\d+$/);
  // El estado ya no es un <Select> disfrazado de boton: es un Badge de
  // solo lectura: el avance real vive en el boton primario / menu
  // secundario del PageHeader.
  await expect(page.getByText('Pendiente anticipo')).toBeVisible();

  await page.getByRole('button', { name: 'Registrar abono' }).click();
  const depositHint = await page.getByText(/Saldo pendiente: \$/).textContent();
  const balance = depositHint?.match(/\$([\d.]+)/)?.[1] ?? '0';
  await page.getByRole('textbox').first().fill(balance);
  await page.getByRole('button', { name: 'Registrar' }).click();

  await expect(page.getByText('Confirmado')).toBeVisible();
  await expect(page.getByText('Anticipo cubierto')).toBeVisible();
});
