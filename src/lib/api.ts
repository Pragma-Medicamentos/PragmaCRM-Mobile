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

/**
 * The API wraps every response in `{ success, message, data?, errors? }`.
 * Callers get `data` directly; anything non-2xx becomes an ApiError carrying
 * the status, which is what separates "session expired" (401) from
 * "account not authorized" (403).
 */
export async function apiFetch<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
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
