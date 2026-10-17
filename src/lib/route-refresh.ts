/**
 * Ventana en la que volver al frente no vuelve a pedir la ruta. El vendedor
 * alterna seguido con WhatsApp o Google Maps en plena visita; sin este umbral,
 * cada cambio de foco sería una petición al backend.
 */
export const RESUME_RELOAD_THRESHOLD_MS = 60_000;

/**
 * Decide si al volver la app al frente hay que pedir la ruta otra vez.
 *
 * Solo mira cuánto tiempo pasó, no si cambió el día: el día lo resuelve el
 * backend en America/El_Salvador (ver `fetchDailyRoute`), y comparar fechas
 * con el reloj y la zona del teléfono metería justo el error que se evita al
 * no mandar `date`. Con un minuto de antigüedad basta para que, tras cruzar
 * la medianoche en segundo plano, la recarga traiga el día nuevo.
 *
 * `loadedAt` null significa que no hay una carga exitosa registrada: recargar.
 */
export function shouldReloadOnResume(loadedAt: number | null, now: number): boolean {
  if (loadedAt === null) return true;
  return now - loadedAt > RESUME_RELOAD_THRESHOLD_MS;
}
