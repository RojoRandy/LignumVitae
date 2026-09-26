import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

const uid = () => `${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api';
const USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

const apiLogin = async (request: APIRequestContext): Promise<string> => {
  const res = await request.post(`${API_URL}/auth/sign-in`, { data: { username: USERNAME, password: PASSWORD } });
  const body = await res.json();
  return body.data.accessToken as string;
};

const seedCatalogProduct = async (request: APIRequestContext, token: string) => {
  const auth = { Authorization: `Bearer ${token}` };
  const categoryRes = await request.post(`${API_URL}/categories`, {
    headers: auth,
    data: { name: `E2E Cat ${uid()}`, colorHex: '#8A9A5B' },
  });
  const category = (await categoryRes.json()).data;

  const candleRes = await request.post(`${API_URL}/candles`, {
    headers: auth,
    data: { name: `E2E Candle ${uid()}`, categoryId: category.id, grams: 100 },
  });
  const candle = (await candleRes.json()).data;

  const productRes = await request.post(`${API_URL}/products`, {
    headers: auth,
    data: { name: `${uid()} E2E Product`, categoryId: category.id, kind: 'SIMPLE', candleId: candle.id },
  });
  return (await productRes.json()).data;
};

test('muestra la advertencia en una cotizacion de un cliente sin telefono', async ({ page, request }) => {
  const token = await apiLogin(request);
  const auth = { Authorization: `Bearer ${token}` };
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: auth,
    data: { fullName: `E2E Sin telefono ${uid()}` },
  });
  expect(customerRes.ok()).toBeTruthy();
  const customer = (await customerRes.json()).data;

  const product = await seedCatalogProduct(request, token);
  const quotationRes = await request.post(`${API_URL}/quotations`, {
    headers: auth,
    data: { customerId: customer.id, items: [{ productId: product.id, quantity: 3 }] },
  });
  expect(quotationRes.ok()).toBeTruthy();
  const quotation = (await quotationRes.json()).data;

  await loginAsAdmin(page);
  await page.goto(`/cotizaciones/${quotation.id}`);
  await expect(page.getByText('Sin teléfono registrado', { exact: true })).toBeVisible();
});
