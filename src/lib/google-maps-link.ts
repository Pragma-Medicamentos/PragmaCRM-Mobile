import type { Coordinates } from './distance';
import { orderByProximity } from './route-order';

/**
 * Una parada de ruta tal como la necesita este helper: la coordenada y si ya
 * se visito. `location` es `null` cuando el geocoding de la parada todavia no
 * corrio o fallo -- esas paradas no pueden entrar en el link, pero tampoco
 * deben tumbar la construccion del resto de la ruta.
 */
export type RouteStop = {
  location: Coordinates | null;
  completed_at: string | null;
};

/**
 * Link listo para abrir, mas los conteos que la pantalla necesita para avisar
 * cuando no entraron todas las paradas pendientes.
 */
export type GoogleMapsLink = {
  url: string;
  /** Paradas que efectivamente van en el link (destino incluido). */
  included: number;
  /** Paradas pendientes con ubicacion, entren o no en el link. */
  pending: number;
};

/**
 * Limite de waypoints de la propia URL API de Google Maps (el destino final
 * no cuenta como waypoint). No hay forma de pedirle a esta API que encadene
 * mas de un tramo, asi que el link lleva como mucho `MAX_STOPS` paradas.
 */
const MAX_WAYPOINTS = 9;
const MAX_STOPS = MAX_WAYPOINTS + 1;

function toLatLng(coordinates: Coordinates): string {
  return `${coordinates.lat},${coordinates.lng}`;
}

/**
 * Arma el link de Google Maps Directions para lo que falta de la ruta del dia.
 *
 * Usa lat/lng en vez de `place_id` a proposito: `place_id` depende de
 * Places API, una dependencia que el ticket no presupuesto (ver §9.2), y
 * ademas puede venir vacio si el geocoding de la parada fallo. La API de
 * directions por URL no necesita mas que coordenadas para funcionar.
 *
 * Solo entran las paradas pendientes (`completed_at` null) con ubicacion,
 * ordenadas por cercania desde `currentLocation` (ver `orderByProximity`).
 * De ellas van las primeras `MAX_STOPS`: las que sobran aparecen solas en el
 * link a medida que se marcan visitas y el vendedor lo vuelve a abrir.
 *
 * No se manda `origin`: al omitirlo, Google Maps arranca desde la ubicacion
 * actual del vendedor, que es justo el punto de partida real de una ruta de
 * campo. La ultima de las paradas elegidas se vuelve `destination` y las
 * anteriores se vuelven `waypoints`, en ese orden.
 *
 * Devuelve `null` si no queda ninguna parada pendiente con ubicacion (lista
 * vacia, sin GPS, o todas visitadas): no hay nada que enlazar.
 */
export function buildGoogleMapsLink(
  stops: RouteStop[],
  currentLocation: Coordinates | null,
): GoogleMapsLink | null {
  const pending = stops.filter(
    (stop): stop is RouteStop & { location: Coordinates } =>
      stop.completed_at === null && stop.location !== null,
  );

  if (pending.length === 0) {
    return null;
  }

  const next = orderByProximity(pending, currentLocation).slice(0, MAX_STOPS);
  const destination = next[next.length - 1].location;
  const waypoints = next.slice(0, -1);

  const query: [string, string][] = [
    ['api', '1'],
    ['destination', toLatLng(destination)],
  ];

  if (waypoints.length > 0) {
    query.push(['waypoints', waypoints.map((stop) => toLatLng(stop.location)).join('|')]);
  }

  query.push(['travelmode', 'driving']);

  return {
    url: `https://www.google.com/maps/dir/?${new URLSearchParams(query).toString()}`,
    included: next.length,
    pending: pending.length,
  };
}

/**
 * Link de Google Maps Directions hacia una sola parada, desde la ubicacion
 * actual (mismo criterio que `buildGoogleMapsLink`: sin `origin`, lat/lng en
 * vez de `place_id`). Es el de la pildora "Abrir en Maps" del pin enfocado,
 * que a diferencia del boton de la ruta no arrastra el resto del dia.
 */
export function buildGoogleMapsStopLink(location: Coordinates): string {
  const query = new URLSearchParams([
    ['api', '1'],
    ['destination', toLatLng(location)],
    ['travelmode', 'driving'],
  ]);
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}
