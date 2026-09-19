export const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export class ApiError extends Error {
  constructor(path: string, public readonly status: number, statusText: string) {
    super(`API ${path}: ${status} ${statusText}`);
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(path, response.status, response.statusText);
  }
  const { data } = await response.json();
  return data;
}

export const imageUrl = (path: string) => (path.startsWith('http') ? path : `${API_ORIGIN}${path}`);
