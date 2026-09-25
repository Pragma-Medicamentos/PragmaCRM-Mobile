import { fetch } from 'expo/fetch';

import {
  buildApiHeaders,
  isSessionUnauthorized,
  SESSION_EXPIRED_MESSAGE,
} from '@/lib/request-config';
import { supabase } from '@/lib/supabase';

export const ROLES = {
  ADMIN: 'Administrador',
  SELLER: 'Vendedor',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface AuthenticatedUser {
  /** Id de `app_user`, no de `auth.users`: es el que usan las demas tablas. */
  id: string;
  authUserId: string;
  role: Role;
  name: string;
  email: string | null;
  /**
   * `null` mientras el vendedor no haya elegido su contrasena definitiva: el
   * panel web crea la cuenta sin contrasena y el primer ingreso pasa por OTP.
   *
   * Lo estampa un trigger de Postgres sobre `auth.users`, en la misma
   * transaccion que el cambio de contraseña, asi que ya esta cuando
   * `updateUser` responde. La app no tiene que avisarle a nadie.
   *
   * Tiene que ser un dato persistente y no uno de la sesion: `verifyOtp` ya deja
   * la sesion guardada, asi que quien mate la app antes de elegir contrasena
   * vuelve a entrar sin pasar nunca por una pantalla de login. Sin este campo se
   * quedaria dentro sin contrasena de forma indefinida.
   */
  passwordSetAt: string | null;
}

/** Unico lugar que decide si hay que exigir el establecimiento de contrasena. */
export function needsPasswordSetup(me: AuthenticatedUser): boolean {
  return me.passwordSetAt === null;
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
 * Compuerta de transporte de PragmaCRM-Api: su middleware `requireApiKey` exige
 * esta cabecera en todo salvo `/api/health`, antes de cualquier grupo de rutas.
 *
 * No es un secreto y no autentica a nadie: las variables EXPO_PUBLIC_ se
 * inlinean en el bundle, asi que cualquiera puede extraerla del APK o del IPA.
 * Quien autentica es el JWT de Supabase que viaja en Authorization.
 */
const apiKey = process.env.EXPO_PUBLIC_API_KEY ?? '';

if (!apiKey) {
  throw new Error(
    'Falta EXPO_PUBLIC_API_KEY. Copia el valor de API_KEY del .env de PragmaCRM-Api\n' +
      'a tu .env.local y reinicia el servidor de desarrollo: sin ella la API responde\n' +
      '401 "Invalid or missing API key" en todas las rutas.',
  );
}

type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

/**
 * Unica salida HTTP hacia PragmaCRM-Api. Usa `expo/fetch` (Fetch de Expo,
 * WinterCG) para que un `EXPO_PUBLIC_USE_RN_FETCH=1` no baje estas llamadas
 * al fetch de React Native. Supabase sigue con su propio cliente.
 */
async function perform<T>(path: string, token: string, init?: RequestInit): Promise<FetchResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: buildApiHeaders(apiKey, token, init?.headers),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }

  const body = (await response.json().catch(() => null)) as { message?: string; data?: T } | null;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.message ?? 'Ocurrió un error inesperado.',
    };
  }
  return { ok: true, data: body?.data as T };
}

async function readAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function refreshAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

/**
 * Cierra la sesion en el dispositivo. `scope: 'local'` no depende de que el
 * access token todavia le sirva al servidor: con un JWT vencido, un logout
 * remoto puede fallar y dejar al vendedor dentro de la app.
 * El guard raiz ve `SIGNED_OUT` y vuelve al login.
 */
async function endSession(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}

async function rejectSession(): Promise<never> {
  await endSession();
  throw new ApiError(401, SESSION_EXPIRED_MESSAGE);
}

/**
 * The API wraps every response in `{ success, message, data?, errors? }`.
 * Callers get `data` directly; anything non-2xx becomes an ApiError carrying
 * the status, which is what separates "session expired" (401) from
 * "account not authorized" (403).
 *
 * Toda llamada que pase por aqui es protegida: el Bearer sale de la sesion
 * guardada en SecureStore, no de un argumento que el llamador pueda omitir.
 * Un 401 de sesion refresca el token una vez; si sigue rechazado, cierra
 * sesion. Un 401 de `x-api-key` no cierra sesion.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await readAccessToken();
  if (!token) return rejectSession();

  const first = await perform<T>(path, token, init);
  if (first.ok) return first.data;
  if (!isSessionUnauthorized(first.status, first.message)) {
    throw new ApiError(first.status, first.message);
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) return rejectSession();

  const second = await perform<T>(path, refreshed, init);
  if (second.ok) return second.data;
  if (isSessionUnauthorized(second.status, second.message)) return rejectSession();
  throw new ApiError(second.status, second.message);
}
