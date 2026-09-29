import { apiFetch } from '@/lib/api';
import type { Coordinates } from '@/lib/distance';

/** Lo que devuelve `PATCH /api/v1/me/route/stops/:id/location`. */
export interface StopCustomerLocation {
  customer_id: string;
  location: Coordinates;
}

export type SetStopLocationInput = {
  /** `DailyRouteStop.id`: el endpoint llega al cliente a traves de la parada. */
  scheduledVisitId: string;
  location: Coordinates;
  accuracyMeters: number;
};

/**
 * Fija el pin del cliente de una parada con la posicion actual del vendedor
 * (PCRM-160).
 *
 * Solo funciona si el cliente todavia no tiene ubicacion: el servidor responde
 * 409 si ya la tenia, y moverla es cosa del Administrador desde el panel web.
 * La precision viaja porque el servidor tambien rechaza lecturas peores que el
 * radio de validacion.
 */
export function setStopLocation(input: SetStopLocationInput): Promise<StopCustomerLocation> {
  return apiFetch<StopCustomerLocation>(
    `/api/v1/me/route/stops/${encodeURIComponent(input.scheduledVisitId)}/location`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: input.location.lat,
        longitude: input.location.lng,
        accuracy_meters: input.accuracyMeters,
      }),
    },
  );
}
