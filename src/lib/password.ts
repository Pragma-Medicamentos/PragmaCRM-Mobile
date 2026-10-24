/**
 * Reglas de la contraseña, sin dependencias: las comparten la pantalla de
 * crearla (`set-password`) y la de cambiarla desde Mi perfil (PCRM-204), y
 * `npm test` las corre en Node sin el cliente de Supabase.
 */

/** Espeja el minimo que exige Supabase Auth (`weak_password` por debajo). */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Devuelve el mensaje en español que bloquea el envio, o undefined si la
 * contraseña y su confirmacion se pueden mandar.
 *
 * No se recorta con trim: un espacio al inicio o al final es parte de la
 * contraseña, y quitarlo aqui haria que el login posterior falle.
 */
export function validateNewPassword(password: string, confirmation: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password !== confirmation) {
    return 'Las contraseñas no coinciden.';
  }
  return undefined;
}
