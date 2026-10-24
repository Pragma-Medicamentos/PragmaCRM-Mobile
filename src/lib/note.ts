/**
 * Reglas de la nota de visita (RF-07), sin dependencias: las usan la hoja de
 * confirmacion y la de editar nota, y `npm test` las corre en Node sin el
 * cliente HTTP (que exige las variables de entorno al importarse).
 */

/**
 * Atajos de nota del wireframe (pantalla 6). Escriben en el campo de texto en
 * vez de mandar un campo propio: `successful` y `no_order_reason` existen en
 * el endpoint, pero tratarlos como texto evita inventarles una semantica que
 * el backend no pidio.
 */
export const NOTE_SHORTCUTS = ['Sin novedad', 'Atendió encargado', 'Cliente ausente'];

/** Espeja `visitNotes` de `visit.schema.ts` en la API: trim, 1..1000. */
export const NOTE_MAX_LENGTH = 1000;

/**
 * Si el borrador se puede guardar sobre la nota actual de la parada.
 *
 * Vacia no: el endpoint exige `min(1)` y no ofrece borrar la nota. Igual a la
 * actual tampoco: seria un viaje al servidor que no cambia nada.
 */
export function canSaveNote(draft: string, current: string | null): boolean {
  const trimmed = draft.trim();
  return trimmed.length > 0 && trimmed.length <= NOTE_MAX_LENGTH && trimmed !== (current ?? '');
}

/**
 * Texto para cada error de `PATCH /api/v1/me/route/stops/:id/note`. Los
 * mensajes del servidor estan en ingles (son para el log, no para el
 * vendedor), asi que se traducen por status. Los de status 0 ya los arma
 * `apiFetch` en español (sin red, timeout) y se muestran tal cual.
 */
export function stopNoteErrorMessage(status: number | null, message: string): string {
  switch (status) {
    case 0:
      return message;
    case 403:
    case 404:
      return 'Esta parada ya no está en tu ruta. Actualizá la lista y probá de nuevo.';
    case 409:
      return 'La parada todavía no está completada. Validá la visita primero.';
    case 422:
      return 'La nota solo se puede editar el mismo día de la parada.';
    default:
      return 'No se pudo guardar la nota.';
  }
}

/**
 * Los status despues de los cuales la ruta en pantalla ya no refleja al
 * servidor (la parada cambio de dueño, se borro o no estaba completada): hay
 * que refrescarla, no solo mostrar el error.
 */
export function noteErrorNeedsRefresh(status: number | null): boolean {
  return status === 403 || status === 404 || status === 409;
}
