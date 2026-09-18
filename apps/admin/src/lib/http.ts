// Envoltura fina sobre fetch que usan las paginas directamente:
// httpGet('/candles'), httpPost('/products', body)... Sin prefijo /api (ya
// esta en API_ORIGIN) y sin pasar por el cliente tipado de openapi-fetch,
// que exige rutas literales — aqui se prioriza la ergonomia de las paginas
// sobre el tipado exacto de la URL; el tipo de la RESPUESTA si se declara
// en cada llamada via el generico <T>.
import { ApiError, type ApiErrorBody } from '@lignumvitae/types';
import type { ProductImageDto } from '@/lib/types';
import { API_ORIGIN, tokenStore } from './api';

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_ORIGIN}/api${path}`, { ...init, headers });

  if (response.status === 401) {
    tokenStore.clear();
    if (!location.pathname.startsWith('/login')) location.href = '/login';
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError((body as ApiErrorBody) ?? { code: 'UNKNOWN', description: 'Error de red', timestamp: new Date().toISOString() });
  }

  return body.data as T;
};

const withQuery = (path: string, params?: Record<string, unknown>) => {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
};

export const httpGet = <T>(path: string, params?: Record<string, unknown>) =>
  request<T>(withQuery(path, params));

export const httpPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) });

export const httpPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });

export const httpPut = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });

export const httpDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Ocurrio un error inesperado';

export const errorCode = (error: unknown): string | undefined => (error instanceof ApiError ? error.code : undefined);

export const uploadProductImage = async (productId: number, file: File, isPrimary = false): Promise<ProductImageDto> => {
  const form = new FormData();
  form.append('file', file);
  form.append('isPrimary', String(isPrimary));
  return request<ProductImageDto>(`/products/${productId}/images`, { method: 'POST', body: form });
};

export const downloadPdf = async (path: string, filename: string) => {
  const token = tokenStore.get();
  const response = await fetch(`${API_ORIGIN}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (response.status === 401) {
    tokenStore.clear();
    if (!location.pathname.startsWith('/login')) location.href = '/login';
  }
  if (!response.ok) throw new Error('No se pudo descargar el PDF');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
