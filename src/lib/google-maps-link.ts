import type { Coordinates } from './distance';

/**
 * Una parada de ruta tal como la necesita este helper: solo la coordenada.
 * `location` es `null` cuando el geocoding de la parada todavia no corrio o
 * fallo -- esas paradas no pueden entrar en el link, pero tampoco deben
 * tumbar la construccion del resto de la ruta.
 */
export type RouteStop = {
  location: Coordinates | null;
};

/**
 * Limite de waypoints de la propia URL API de Google Maps (el destino final
 * no cuenta como waypoint). Las paradas que sobran del recorrido simplemente
 * no entran en el link: no hay forma de pedirle a esta API que encadene mas
 * de un tramo.
 */
const MAX_WAYPOINTS = 9;

function toLatLng(coordinates: Coordinates): string {
  return `${coordinates.lat},${coordinates.lng}`;
}

/**
 * Arma el link de Google Maps Directions para la ruta del dia completa.
 *
 * Usa lat/lng en vez de `place_id` a proposito: `place_id` depende de
 * Places API, una dependencia que el ticket no presupuesto (ver §9.2), y
 * ademas puede venir vacio si el geocoding de la parada fallo. La API de
 * directions por URL no necesita mas que coordenadas para funcionar.
 *
 * No se manda `origin`: al omitirlo, Google Maps arranca desde la ubicacion
 * actual del vendedor, que es justo el punto de partida real de una ruta de
 * campo. La ultima parada con ubicacion se vuelve `destination` y las
 * anteriores (hasta `MAX_WAYPOINTS`) se vuelven `waypoints`, en el mismo
 * orden en que llegan.
 *
 * Devuelve `null` si ninguna parada tiene ubicacion (o si la lista viene
 * vacia): no hay nada que enlazar.
 */
export function buildGoogleMapsLink(stops: RouteStop[]): string | null {
  const located = stops.filter(
    (stop): stop is { location: Coordinates } => stop.location !== null,
  );

  if (located.length === 0) {
    return null;
  }

  const destination = located[located.length - 1].location;
  const waypoints = located.slice(0, -1).slice(0, MAX_WAYPOINTS);

  const query: [string, string][] = [
    ['api', '1'],
    ['destination', toLatLng(destination)],
  ];

  if (waypoints.length > 0) {
    query.push(['waypoints', waypoints.map((stop) => toLatLng(stop.location)).join('|')]);
  }

  query.push(['travelmode', 'driving']);

  return `https://www.google.com/maps/dir/?${new URLSearchParams(query).toString()}`;
}
