import { createApiClient } from '@lignumvitae/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const TOKEN_KEY = 'lignumvitae.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = createApiClient({
  baseUrl: API_ORIGIN,
  getToken: tokenStore.get,
  onUnauthorized: () => {
    tokenStore.clear();
    // Recarga dura a proposito: limpia tambien la cache de TanStack Query,
    // que si no seguiria mostrando datos de la sesion que acaba de cerrar.
    if (!location.pathname.startsWith('/login')) location.href = '/login';
  },
});

export const staticUrl = (path: string) => (path.startsWith('http') ? path : `${API_ORIGIN}${path}`);
