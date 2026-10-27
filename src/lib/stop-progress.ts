/**
 * Lo unico que estos helpers miran de una parada. Estructural y no
 * `Pick<DailyRouteStop, ...>` para que las pruebas no arrastren `daily-route.ts`
 * (que importa `apiFetch`).
 */
type ProgressStop = { completed_at: string | null };

/**
 * Cuantas paradas faltan visitar (PCRM-208). Es el numero que acompaña a
 * "Paradas de hoy" y a "Ver paradas": el vendedor quiere ver cuanto le
 * queda, no el total del dia, que no se mueve aunque ya haya marcado la mitad.
 */
export function countPendingStops(stops: readonly ProgressStop[]): number {
  return stops.filter((stop) => stop.completed_at === null).length;
}

/**
 * Pendientes primero, completadas al final (PCRM-209): con rutas de 30
 * paradas, las ya visitadas arriba obligaban a hacer scroll cada vez mas
 * para llegar a la proxima.
 *
 * Orden estable: dentro de cada grupo se respeta el orden del backend, asi
 * que la siguiente pendiente sigue siendo la que tocaba segun la ruta. No
 * muta `stops` -- el mismo arreglo alimenta el mapa, que no se reordena.
 */
export function pendingStopsFirst<T extends ProgressStop>(stops: readonly T[]): T[] {
  const pending = stops.filter((stop) => stop.completed_at === null);
  const completed = stops.filter((stop) => stop.completed_at !== null);
  return [...pending, ...completed];
}
