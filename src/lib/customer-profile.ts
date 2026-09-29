/**
 * Perfil comercial del cliente (RF-12) tal como lo muestra la app: personalidad
 * por color y potencial de compra.
 *
 * Vive suelto y sin imports de React Native para que la normalizacion quede
 * cubierta por `node --test`: las dos columnas son texto libre en la base, y
 * lo que decide si la tarjeta dibuja algo o no es esta funcion, no el JSX.
 */

export type PersonalityKey = 'rojo' | 'amarillo' | 'verde' | 'azul';
export type PotentialKey = 'alto' | 'medio' | 'bajo';

export const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  rojo: 'Rojo',
  amarillo: 'Amarillo',
  verde: 'Verde',
  azul: 'Azul',
};

export const POTENTIAL_LABELS: Record<PotentialKey, string> = {
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

/**
 * Reduce un valor crudo a una clave conocida, o null.
 *
 * La base guarda minusculas, pero el dato entra por el panel web y por la
 * importacion: un `"Rojo "` no debe apagar el chip. Un valor que no esta en
 * la lista si lo apaga -- pintarlo con un color inventado seria afirmar algo
 * sobre el cliente que nadie cargo.
 */
function normalize<K extends string>(value: string | null, keys: Record<K, string>): K | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(keys, key) ? (key as K) : null;
}

export function personalityKey(value: string | null): PersonalityKey | null {
  return normalize(value, PERSONALITY_LABELS);
}

export function potentialKey(value: string | null): PotentialKey | null {
  return normalize(value, POTENTIAL_LABELS);
}

// `en-US` y no `es-SV`: El Salvador usa dolares con el formato de EE. UU.
// (`$1,234.56`), y Hermes no trae datos de todos los locales en Android, asi
// que `es-SV` podria caer a otro formato segun el dispositivo.
const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `$1,500.00`, o null si el cliente no tiene limite cargado. */
export function formatCreditLimit(value: number | null): string | null {
  return value === null ? null : CURRENCY.format(value);
}
