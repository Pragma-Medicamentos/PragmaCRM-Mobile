import { haversineMeters, type Coordinates } from './distance';

/**
 * Ordena paradas por vecino mas cercano, arrancando desde `start`.
 *
 * Es la unica excepcion a "el cliente no reordena" (ver `daily-route.ts`):
 * este orden solo alimenta el link de Google Maps, porque la URL API de
 * directions recorre los waypoints en el orden en que llegan y no los
 * optimiza. La lista y el mapa siguen mostrando el orden del backend.
 *
 * Es una heuristica voraz, no la ruta optima: alcanza para las cinco a diez
 * paradas de un dia y no necesita la Directions API (paga) para optimizar.
 *
 * Con `start` en null (permiso de ubicacion denegado o sin fix todavia) no
 * hay desde donde medir el primer tramo, asi que se devuelve el orden del
 * backend sin tocar. Los empates se resuelven por el indice original para
 * que el orden no salte entre renders.
 */
export function orderByProximity<T extends { location: Coordinates }>(
  stops: T[],
  start: Coordinates | null,
): T[] {
  if (start === null) {
    return stops.slice();
  }

  const remaining = stops.slice();
  const ordered: T[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineMeters(current, remaining[0].location);

    for (let i = 1; i < remaining.length; i++) {
      const distance = haversineMeters(current, remaining[i].location);
      // `<` estricto: ante empate gana la que vino antes en el backend.
      if (distance < nearestDistance) {
        nearestIndex = i;
        nearestDistance = distance;
      }
    }

    const [nearest] = remaining.splice(nearestIndex, 1);
    ordered.push(nearest);
    current = nearest.location;
  }

  return ordered;
}
