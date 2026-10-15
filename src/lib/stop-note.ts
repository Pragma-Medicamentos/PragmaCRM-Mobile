import { apiFetch } from '@/lib/api';

/** Lo que devuelve `PATCH /api/v1/me/route/stops/:id/note`. */
export interface StopNote {
  /** `scheduled_visit.id`, el mismo id al que se dirigio la peticion. */
  id: string;
  visit_id: string;
  notes: string;
  updated_at: string;
}

export type SetStopNoteInput = {
  /** `DailyRouteStop.id`: la nota llega a la visita a traves de la parada. */
  scheduledVisitId: string;
  notes: string;
};

/**
 * Agrega o reemplaza la nota de una parada ya completada (RF-07).
 *
 * Reemplaza, no concatena: un reintento offline deja el mismo texto en vez de
 * duplicarlo. El servidor solo la acepta el dia planificado de la parada
 * (422 si no) y si la parada ya tiene visita (409 si no).
 */
export function setStopNote(input: SetStopNoteInput): Promise<StopNote> {
  return apiFetch<StopNote>(
    `/api/v1/me/route/stops/${encodeURIComponent(input.scheduledVisitId)}/note`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: input.notes.trim() }),
    },
  );
}
