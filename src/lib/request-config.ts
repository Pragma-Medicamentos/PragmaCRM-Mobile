/**
 * Configuracion pura de las peticiones a PragmaCRM-Api.
 *
 * No importa Expo ni Supabase: `api.ts` es el unico que habla con la red.
 * Asi se puede comprobar, sin dispositivo, que una llamada protegida no sale
 * sin Authorization y que un 401 de sesion no se confunde con la compuerta
 * `x-api-key`.
 */

export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Inicia sesión de nuevo.';

/**
 * Arma los headers de una llamada protegida.
 *
 * `Authorization` y `x-api-key` se aplican al final a proposito: un `headers`
 * que pase el llamador no puede quitar el token ni la compuerta de transporte.
 * `Content-Type` solo se rellena si nadie lo definio.
 */
export function buildApiHeaders(apiKey: string, token: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-api-key', apiKey);
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

/** 401 de la compuerta de transporte, no de la sesion del vendedor. */
export function isApiKeyRejection(status: number, message?: string): boolean {
  return status === 401 && /api key/i.test(message ?? '');
}

/**
 * 401 que significa sesion ausente, vencida o rechazada.
 * La compuerta `x-api-key` tambien responde 401, pero cerrar sesion no la arregla.
 */
export function isSessionUnauthorized(status: number, message?: string): boolean {
  return status === 401 && !isApiKeyRejection(status, message);
}
