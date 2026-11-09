import { haversineMeters, type Coordinates } from './distance.ts';
import { pendingStopsFirst } from './stop-progress.ts';

/**
 * Lo unico que este orden mira de una parada. Estructural, igual que
 * `stop-progress.ts`, para que las pruebas no arrastren `daily-route.ts`.
 */
type SortableStop = { completed_at: string | null; location: Coordinates | null };

/**
 * Orden de la hoja de paradas: con carteras grandes el vendedor busca al
 * cliente que tiene enfrente, no al que tocaba segun la ruta.
 *
 * 1. Pendientes con GPS, de la mas cercana a la mas lejana a `origin`.
 * 2. Pendientes sin GPS, en el orden del backend: no hay desde donde medir.
 * 3. Completadas al final, en el orden del backend (PCRM-209).
 *
 * Es distancia en linea recta de cada parada al vendedor, no el vecino mas
 * cercano encadenado de `route-order.ts` (ese arma el recorrido del link de
 * Maps). Con `origin` en null (vista previa de otro dia, o sin permiso o sin
 * fix) queda igual que `pendingStopsFirst`. Orden estable y sin mutar
 * `stops`: el mismo arreglo alimenta el mapa.
 */
export function sortStopsForSheet<T extends SortableStop>(
  stops: readonly T[],
  origin: Coordinates | null,
): T[] {
  if (origin === null) {
    return pendingStopsFirst(stops);
  }

  const pending = stops.filter((stop) => stop.completed_at === null);
  const completed = stops.filter((stop) => stop.completed_at !== null);
  const located = pending
    .filter((stop) => stop.location !== null)
    .map((stop) => ({ stop, distance: haversineMeters(origin, stop.location!) }))
    // `Array.prototype.sort` es estable: ante empate queda la que vino antes.
    .sort((a, b) => a.distance - b.distance)
    .map(({ stop }) => stop);
  const unlocated = pending.filter((stop) => stop.location === null);

  return [...located, ...unlocated, ...completed];
}
