// Agregar productos a un pedido ya aceptado: un pedido de 15 piezas a
// menudeo recibe las piezas que le faltan para el umbral de mayoreo, y todo
// el pedido pasa a mayoreo con el total recalculado.
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

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const seedOrder = async (request: APIRequestContext, token: string) => {
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: auth(token),
    data: { fullName: `E2E Add Items ${uid()}`, phone: '5551234567' },
  });
  const customer = (await customerRes.json()).data;
  const product = await seedCatalogProduct(request, token);

  const quotationRes = await request.post(`${API_URL}/quotations`, {
    headers: auth(token),
    data: { customerId: customer.id, items: [{ productId: product.id, quantity: 15 }] },
  });
  const quotation = (await quotationRes.json()).data;
  const orderRes = await request.post(`${API_URL}/orders/from-quotation/${quotation.id}`, { headers: auth(token) });
  return { order: (await orderRes.json()).data as { id: number; priceTier: string }, product };
};

test('agrega productos y el pedido pasa a mayoreo', async ({ page, request }) => {
  const token = await apiLogin(request);
  const settings = (await (await request.get(`${API_URL}/settings`, { headers: auth(token) })).json()).data;
  const threshold = settings.wholesaleThresholdQty as number;
  test.skip(threshold <= 15, 'El umbral de mayoreo ya es de 15 piezas o menos');

  const { order, product } = await seedOrder(request, token);
  expect(order.priceTier).toBe('RETAIL');

  await loginAsAdmin(page);
  await page.goto(`/pedidos/${order.id}`);
  await page.getByRole('button', { name: 'Agregar productos' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByText('Elegir producto...').click();
  await page.getByRole('option', { name: product.name }).click();
  await dialog.locator('#qty-0').fill(String(threshold - 15));
  await expect(dialog.getByText('Mayoreo', { exact: true }).last()).toBeVisible({ timeout: 10_000 });

  await dialog.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByText('Productos agregados')).toBeVisible();

  const updated = (await (await request.get(`${API_URL}/orders/${order.id}`, { headers: auth(token) })).json()).data;
  const items = updated.items as { lineTotal: string }[];
  expect(items).toHaveLength(2);
  expect(updated.totalQuantity).toBe(threshold);
  expect(updated.priceTier).toBe('WHOLESALE');
  const lines = items.reduce((acc, item) => acc + Number(item.lineTotal), 0);
  expect(Number(updated.total)).toBeCloseTo(lines - Number(updated.discountAmount) + Number(updated.shippingCost), 2);
});
