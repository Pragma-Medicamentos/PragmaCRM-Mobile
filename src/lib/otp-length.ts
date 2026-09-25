/**
 * Longitud del código del proyecto hosted de Supabase. El `config.toml` local
 * dice 6 y no aplica: la pantalla ya exigió 6 mientras llegaban códigos de 8.
 *
 * `EXPO_PUBLIC_OTP_LENGTH` puede sobrescribirlo, pero si la variable no llega
 * (no está en el entorno de EAS, o nadie copió `.env.example`) se usa este
 * valor. El ejemplo no es la fuente de verdad.
 */
export const DEFAULT_OTP_LENGTH = 8;

export function resolveOtpLength(raw: string | undefined = process.env.EXPO_PUBLIC_OTP_LENGTH): number {
  if (raw == null || raw.trim() === '') return DEFAULT_OTP_LENGTH;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_OTP_LENGTH;
  return parsed;
}
