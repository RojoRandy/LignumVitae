// Cliente OpenAPI tipado, mismo patron que packages/types de Agencia:
// openapi-fetch + un `unwrap()` que desempaqueta el envelope
// `{ data, success, message }` que devuelve toda la API, y convierte los
// errores del catalogo (`{ code, description, ... }`) en un `Error` normal
// con `.code` y `.details` para que el admin pueda ramificar sobre el codigo.
import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './openapi-schema';

export interface ApiEnvelope<T> {
  data: T;
  success: boolean;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  description: string;
  timestamp: string;
  data?: unknown;
  path?: string;
}

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(body: ApiErrorBody) {
    super(body.description);
    this.name = 'ApiError';
    this.code = body.code;
    this.details = body.data;
  }
}

export interface CreateApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
  onUnauthorized?: () => void;
}

export const createApiClient = (options: CreateApiClientOptions) => {
  const client = createClient<paths>({ baseUrl: options.baseUrl });

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const token = options.getToken?.();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
    async onResponse({ response }) {
      if (response.status === 401) options.onUnauthorized?.();
      return response;
    },
  };

  client.use(authMiddleware);
  return client;
};

/** Desempaqueta { data, error } de openapi-fetch hacia el `data` real o lanza ApiError. */
export const unwrap = <T>(result: { data?: ApiEnvelope<T>; error?: ApiErrorBody }): T => {
  if (result.error) throw new ApiError(result.error);
  if (!result.data) throw new Error('Respuesta vacia del servidor');
  return result.data.data;
};
