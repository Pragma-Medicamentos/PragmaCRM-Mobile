export const ROLES = {
  ADMIN: 'Administrador',
  SELLER: 'Vendedor',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface AuthenticatedUser {
  id: string;
  clerkUserId: string;
  role: Role;
  name: string;
  email: string | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

if (!baseUrl) {
  throw new Error('Missing EXPO_PUBLIC_API_URL. Add the PragmaCRM-Api base URL to .env.local.');
}

/**
 * The API wraps every response in `{ success, message, data?, errors? }`.
 * Callers get `data` directly; anything non-2xx becomes an ApiError carrying
 * the status, which is what separates "session expired" (401) from
 * "account not authorized" (403).
 */
export async function apiFetch<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? 'Ocurrió un error inesperado.');
  }

  return body?.data as T;
}
