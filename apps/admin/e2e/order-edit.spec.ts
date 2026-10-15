// Edicion de un pedido ya aceptado: dividir un renglon en partes con su
// propio color (31 ositos -> 15 + 10 + 6) y completar notas. El pedido se
// siembra por API igual que en sales-flow.spec.ts.
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

const seedOrder = async (request: APIRequestContext, token: string) => {
  const auth = { Authorization: `Bearer ${token}` };
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: auth,
    data: { fullName: `E2E Order Edit ${uid()}`, phone: '5551234567' },
  });
  const customer = (await customerRes.json()).data;
  const product = await seedCatalogProduct(request, token);

  const quotationRes = await request.post(`${API_URL}/quotations`, {
    headers: auth,
    data: { customerId: customer.id, items: [{ productId: product.id, quantity: 31, withFragrance: true, candleColor: 'Blanco' }] },
  });
  const quotation = (await quotationRes.json()).data;

  const orderRes = await request.post(`${API_URL}/orders/from-quotation/${quotation.id}`, { headers: auth });
  return (await orderRes.json()).data as { id: number; total: string };
};

const getOrder = async (request: APIRequestContext, token: string, id: number) => {
  const res = await request.get(`${API_URL}/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).data;
};

test('divide un renglon en partes con su color', async ({ page, request }) => {
  const token = await apiLogin(request);
  const order = await seedOrder(request, token);

  await loginAsAdmin(page);
  await page.goto(`/pedidos/${order.id}`);
  await page.getByRole('button', { name: 'Dividir' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Cantidad parte 1').fill('15');
  await dialog.getByLabel('Cantidad parte 2').fill('10');
  await dialog.getByRole('button', { name: 'Agregar parte' }).click();
  await dialog.getByLabel('Cantidad parte 3').fill('6');
  await dialog.getByLabel('Color parte 2').fill('Azul');
  await dialog.getByLabel('Color parte 3').fill('Azul');
  await expect(dialog.getByText('Suman 31 de 31')).toBeVisible();

  await dialog.getByRole('button', { name: 'Dividir' }).click();
  await expect(page.getByText('Renglón dividido')).toBeVisible();

  const updated = await getOrder(request, token, order.id);
  const items = updated.items as { quantity: number; candleColor: string | null }[];
  expect(items.map((item) => item.quantity)).toEqual([15, 10, 6]);
  expect(items.map((item) => item.candleColor)).toEqual(['Blanco', 'Azul', 'Azul']);
  expect(updated.total).toBe(order.total);
});

test('edita fecha y notas', async ({ page, request }) => {
  const token = await apiLogin(request);
  const order = await seedOrder(request, token);

  await loginAsAdmin(page);
  await page.goto(`/pedidos/${order.id}`);
  await page.getByRole('button', { name: 'Cambiar estado manualmente' }).click();
  await page.getByRole('menuitem', { name: 'Editar fecha y notas' }).click();

  await page.getByLabel('Notas').fill('Entregar en salón');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Pedido actualizado')).toBeVisible();

  const updated = await getOrder(request, token, order.id);
  expect(updated.notes).toBe('Entregar en salón');
});
