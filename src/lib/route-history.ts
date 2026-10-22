import { apiFetch } from '@/lib/api';
import type { RouteRef, StopType } from '@/lib/daily-route';

/** Una parada de un dia pasado que nadie marco (PCRM-203). */
export interface SkippedStop {
  /** `scheduled_visit.id`, el mismo id que trae `GET /me/route?date=`. */
  id: string;
  name: string;
  stop_type: StopType;
}

/** Un dia pasado del vendedor, resumido para la lista del historial. */
export interface RouteHistoryDay {
  /** `YYYY-MM-DD`, dia calendario en la zona del negocio. */
  date: string;
  /** Las asignaciones con paradas ese dia. Nunca vacio. */
  routes: RouteRef[];
  /** Paradas del dia, extras y prospectos incluidos. */
  total: number;
  completed: number;
  /**
   * `total - completed`. La app todavia no tiene "Omitir parada" con motivo
   * (wireframe 7), asi que omitida quiere decir "sin marcar" y no hay motivo
   * que mostrar.
   */
  skipped: number;
  /** Las omitidas, en el orden de la ruta. */
  skipped_stops: SkippedStop[];
}

export interface RouteHistory {
  /** Del mas reciente al mas viejo. Los dias sin paradas no vienen. */
  days: RouteHistoryDay[];
  /** El `before` de la pagina siguiente, o null si no hay mas dias. */
  next_before: string | null;
}

/** Dias por pagina. El backend acepta hasta 60. */
export const ROUTE_HISTORY_PAGE_SIZE = 20;

/**
 * Trae una pagina del historial del vendedor autenticado.
 *
 * Sin `before` el backend arranca en ayer, en la zona del negocio: hoy nunca
 * aparece en el historial, ya tiene su propia pantalla.
 */
export function fetchRouteHistory(before?: string): Promise<RouteHistory> {
  const params = new URLSearchParams({ limit: String(ROUTE_HISTORY_PAGE_SIZE) });
  if (before) params.set('before', before);
  return apiFetch<RouteHistory>(`/api/v1/me/route/history?${params.toString()}`);
}
