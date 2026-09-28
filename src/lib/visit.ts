import { apiFetch } from '@/lib/api';
import type { Coordinates } from '@/lib/distance';

/** Lo que `POST /api/v1/visits` devuelve al confirmar una parada (RF-06). */
export interface ConfirmedVisit {
  id: string;
  scheduled_visit_id: string;
  customer_id: string;
  /** Distancia calculada por el servidor contra el pin del cliente, en metros. */
  distance_meters: number;
  /** Derivado de `distance_meters` en el servidor, nunca almacenado. */
  within_radius: boolean;
  radius_meters: number;
  notes: string | null;
  /** True cuando la peticion repitio una parada ya confirmada (reintento offline). */
  replayed: boolean;
}

export type ConfirmVisitInput = {
  /** Es `DailyRouteStop.id`: la ruta diaria ya expone el `scheduled_visit.id`. */
  scheduledVisitId: string;
  location: Coordinates;
  /** Vacia o solo espacios se omite: el schema exige `min(1)` si viene. */
  notes?: string;
};

/**
 * Confirma una parada con la posicion GPS del vendedor.
 *
 * `captured_at` es el instante del toque en el dispositivo, no el de llegada
 * al servidor: la app puede estar sin señal y sincronizar despues, y el
 * registro tiene que conservar lo que paso en la calle. Va en ISO con offset
 * porque el schema rechaza timestamps sin el -- `toISOString()` produce `Z`,
 * que es un offset explicito y pasa la validacion.
 *
 * No manda `successful` ni `no_order_reason`: son los campos de RF-07
 * (resultado de la visita) y no los cubre este ticket. Los atajos del
 * formulario escriben en `notes`, que es texto libre, en vez de inventarles
 * una semantica que el backend no pidio.
 */
export async function confirmVisit(input: ConfirmVisitInput): Promise<ConfirmedVisit> {
  const notes = input.notes?.trim();

  return apiFetch<ConfirmedVisit>('/api/v1/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduled_visit_id: input.scheduledVisitId,
      latitude: input.location.lat,
      longitude: input.location.lng,
      captured_at: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    }),
  });
}
