import { apiFetch } from '@/lib/api';
import type { Coordinates } from '@/lib/distance';
import { buildProspectBody, type ValidProspect } from '@/lib/prospect-form';

/** Lo que `POST /api/v1/prospects` devuelve (PCRM-62). */
export interface RegisteredProspect {
  id: string;
  name: string;
  phone: string | null;
  user_id: string;
  location: { lat: number; lng: number };
  created_at: string;
  /** Eco de lo que mando la app: la tabla no tiene esta columna. */
  captured_at: string;
  status: string | null;
}

/**
 * Registra un prospecto levantado en campo (RF-10, PCRM-175).
 *
 * El vendedor no viaja en el cuerpo: el servidor lo saca del JWT, asi que la
 * app no puede registrar un prospecto a nombre de otro.
 *
 * `capturedAt` se recibe como argumento en vez de resolverse aca adentro para
 * que sea el momento en que el vendedor toco "Guardar" y no el de esta
 * llamada -- son lo mismo hoy, pero dejarlo explicito es lo que hace que la
 * hoja pueda fijarlo antes de un reintento.
 */
export async function registerProspect(
  prospect: ValidProspect,
  location: Coordinates,
  capturedAt: Date,
): Promise<RegisteredProspect> {
  return apiFetch<RegisteredProspect>('/api/v1/prospects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildProspectBody(prospect, location, capturedAt)),
  });
}
