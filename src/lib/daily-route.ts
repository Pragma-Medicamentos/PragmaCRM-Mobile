import { apiFetch } from '@/lib/api';
import type { Coordinates } from '@/lib/distance';

/** Clasificacion de la parada (CLAUDE.md 5.2 del repo de la API). */
export type StopType = 'visit' | 'dispatch' | 'collection';

/**
 * A que tabla apunta la parada. No es un union en runtime: la DB ya garantiza
 * que exactamente uno de `customer_id`/`prospect_id` esta seteado, asi que
 * este campo llega derivado desde el backend.
 */
export type TargetKind = 'customer' | 'prospect';

/**
 * Una ruta con al menos una parada asignada al vendedor ese dia.
 *
 * Trae `route_user_id` porque el grano es la asignacion, no la ruta: la misma
 * ruta puede asignarsele al mismo vendedor en dos dias de semana distintos y
 * cada asignacion es su propia fila.
 */
export interface RouteRef {
  id: string;
  route_user_id: string;
  name: string;
  municipality: string | null;
  zone: string | null;
}

/** Una tarjeta de la lista de ruta diaria y un pin en su mapa. */
export interface DailyRouteStop {
  /**
   * `scheduled_visit.id`. Es a la vez la key de la lista y la identidad del
   * pin en el mapa: el desempate por `sv.id` en el orden del backend existe
   * justamente para que esto no cambie entre refetches.
   */
  id: string;
  /** Siempre presente en `routes[]` de la respuesta. */
  route: { id: string; name: string };
  stop_type: StopType;
  target_kind: TargetKind;
  target_id: string;
  name: string;
  trade_name: string | null;
  address: string | null;
  /** Siempre null cuando `target_kind` es 'prospect': esa tabla no tiene zona. */
  zone: string | null;
  /** Siempre null cuando `target_kind` es 'prospect'. */
  municipality: string | null;
  phone: string | null;
  /**
   * Null cuando el destino no tiene GPS cargado, un caso real y frecuente (la
   * lista de clientes tiene un filtro `without_gps`). El conteo de pines va a
   * diferir del conteo de paradas por diseno, y la tarjeta degrada a mostrar
   * solo la zona, sin distancia.
   */
  location: Coordinates | null;
  /** `route_customer.sort_order`. Null en extras y en prospectos. */
  sort_order: number | null;
  /**
   * Derivado, nunca almacenado: true cuando no hay una fila viva de
   * `route_customer` que ligue el destino a esta ruta. Los prospectos son
   * extra por definicion, porque no tienen membresia de ruta.
   */
  is_extra: boolean;
  /** `scheduled_visit.reason` -- por que se agrego una parada ad-hoc. */
  reason: string | null;
  /**
   * ISO 8601 en el cable (`visit.started_at` de la ejecucion enlazada). Null
   * significa que la parada sigue pendiente.
   */
  completed_at: string | null;
}

export interface DailyRoute {
  /** El dia efectivamente servido, `YYYY-MM-DD`. Repite el default resuelto. */
  date: string;
  /**
   * Vacio cuando el vendedor no tiene paradas ese dia. `routes` y `stops`
   * llegan vacios juntos, nunca uno sin el otro.
   */
  routes: RouteRef[];
  /**
   * Plana y ya ordenada. El cliente no reordena, salvo el link de Google Maps
   * (ver `route-order.ts`), que no toca este arreglo.
   */
  stops: DailyRouteStop[];
}

/**
 * Trae la ruta diaria del vendedor autenticado.
 *
 * Sin `date`, el backend resuelve "hoy" en la zona horaria del negocio
 * (America/El_Salvador), no la del dispositivo -- por eso el parametro es
 * opcional y no se calcula una fecha local aca.
 *
 * Nunca devuelve 404: un vendedor sin ruta ese dia es una respuesta valida
 * con `routes: []` y `stops: []`.
 */
export function fetchDailyRoute(token: string | null, date?: string): Promise<DailyRoute> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<DailyRoute>(`/api/v1/me/route${query}`, token);
}
