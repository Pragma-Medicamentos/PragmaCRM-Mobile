/**
 * `es-SV` con `hour: 'numeric', minute: '2-digit'` no da directamente
 * `9:10am`: devuelve el periodo del dia como literal separado ("a. m." /
 * "p. m.", con espacios y puntos). Formatear a texto y recortar con regex
 * es fragil si el motor ICU cambia la puntuacion; pedir las partes con
 * `formatToParts` y quedarse solo con las letras del `dayPeriod` es estable
 * sin importar como el runtime decida puntuarlo.
 *
 * La zona horaria va fija en `America/El_Salvador` a proposito: la hora de
 * una parada es un dato de negocio, no algo que deba cambiar si el telefono
 * del vendedor tiene otro huso (roaming, reloj mal configurado, etc.).
 */
const timeFormatter = new Intl.DateTimeFormat('es-SV', {
  timeZone: 'America/El_Salvador',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Formatea un instante ISO como la hora de una parada de ruta: `9:10am`.
 */
export function formatStopTime(iso: string): string {
  const parts = timeFormatter.formatToParts(new Date(iso));

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value ?? '';

  // "a. m." / "p. m." -> "am" / "pm": nos quedamos solo con las letras.
  const suffix = dayPeriod.replace(/[^a-zA-Z]/g, '').toLowerCase();

  return `${hour}:${minute}${suffix}`;
}
