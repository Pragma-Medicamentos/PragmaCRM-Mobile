import type { AuthError } from '@supabase/supabase-js';

/**
 * Los mensajes de supabase-js llegan en ingles y con vocabulario de proveedor.
 * Se traducen aqui para que las pantallas no carguen con un switch de strings
 * ajenos, y para que el usuario no vea "Invalid login credentials".
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Tu correo aún no está confirmado. Contacta al administrador.',
  user_banned: 'Tu cuenta está deshabilitada. Contacta al administrador.',
  user_not_found: 'Correo o contraseña incorrectos.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  validation_failed: 'Revisa que el correo y la contraseña estén completos.',
  same_password: 'La nueva contraseña debe ser distinta a la actual.',
  weak_password: 'La contraseña es demasiado débil. Usa al menos 8 caracteres.',
  session_expired: 'Tu sesión expiró. Inicia sesión de nuevo.',

  // Codigo de un solo uso.
  otp_expired: 'El código expiró o no es correcto. Solicita uno nuevo.',
  otp_disabled: 'El acceso por código no está habilitado. Contacta al administrador.',
  over_email_send_rate_limit: 'Espera un momento antes de solicitar otro código.',
};

export function toSpanishAuthMessage(error: AuthError | null): string | undefined {
  if (!error) return undefined;

  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];

  // supabase-js mete en `AuthRetryableFetchError` dos cosas muy distintas: los
  // fallos de red reales (status 0) y cualquier respuesta 5xx del servidor. Hay
  // que separarlas, porque culpar a la conexión del usuario cuando el problema
  // está del otro lado manda a revisar el wifi durante horas. El caso típico es
  // un 500 "Error sending magic link email" cuando el SMTP no logra entregar.
  if (error.name === 'AuthRetryableFetchError') {
    return error.status === 0
      ? 'No se pudo conectar con el servidor. Verifica tu conexión.'
      : 'El servidor de autenticación falló. No es tu conexión: vuelve a intentarlo o avisa al administrador.';
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
