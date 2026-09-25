/**
 * Longitud del código del proyecto hosted. El `config.toml` local dice 6 y no
 * aplica: la pantalla ya exigió 6 mientras llegaban códigos de 8.
 *
 * `EXPO_PUBLIC_OTP_LENGTH` puede sobrescribirlo. Si no llega, está vacía o no
 * es un entero positivo, se usan 8. No depende de que alguien copie `.env.example`.
 */
export const DEFAULT_OTP_LENGTH = 8;

export function resolveOtpLength(raw: string | undefined = process.env.EXPO_PUBLIC_OTP_LENGTH): number {
  if (raw == null || raw.trim() === '') return DEFAULT_OTP_LENGTH;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_OTP_LENGTH;
  return parsed;
}
