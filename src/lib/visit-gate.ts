import type { DailyRouteStop } from './daily-route';
// Con extension explicita, a diferencia del resto de `src/lib`: es un import
// de valores, no de tipos, asi que sobrevive al type stripping y lo tiene que
// resolver Node cuando corre `npm test`. Node en ESM no adivina extensiones.
// Los imports `type`-only se borran antes de llegar ahi, por eso el de arriba
// puede ir sin ella.
import { formatDistance, haversineMeters, type Coordinates } from './distance.ts';

/**
 * Radio de validacion GPS en metros (RF-06).
 *
 * Espeja `GPS_RADIUS_METERS` de `visit.service.ts` en la API. Esta duplicado a
 * proposito y no viene en la respuesta del endpoint: la compuerta tiene que
 * poder decidir **antes** de mandar nada, que es justamente lo que pide CA2 de
 * HU-06 ("el sistema rechaza el registro y notifica el motivo"). El servidor
 * igual recalcula la distancia contra el pin del cliente y devuelve su propio
 * `within_radius`, asi que el numero autoritativo sigue siendo el suyo; este
 * solo decide si el boton se habilita.
 */
export const GPS_RADIUS_METERS = 80;

/**
 * Si la parada admite siquiera el boton de validar visita.
 *
 * Son tres negativas y ninguna es una cuestion de distancia, por eso viven
 * separadas de `visitGate`:
 *
 *  - **Prospecto.** El endpoint responde 422 ("visits only support
 *    customers"): `visit` no tiene `prospect_id`. Un prospecto se puede
 *    planificar como parada pero no ejecutar. La compuerta va sobre
 *    `target_kind`, NO sobre `location !== null` -- un prospecto con GPS
 *    cargado seguiria siendo irrealizable, y sin esto el vendedor abriria el
 *    formulario para comerse un error que no puede resolver.
 *  - **Ya completada.** `completed_at` no nulo. El endpoint es idempotente y
 *    responderia 409, pero no hay motivo para ofrecer el boton.
 *  - **Sin pin.** El servidor calcula la distancia contra la ubicacion del
 *    cliente; sin ella no hay contra que comparar. Es un caso real: la lista
 *    de clientes tiene un filtro `without_gps`.
 */
export function isVisitable(
  stop: Pick<DailyRouteStop, 'target_kind' | 'completed_at' | 'location'>,
): boolean {
  return stop.target_kind === 'customer' && stop.completed_at === null && stop.location !== null;
}

/**
 * Resultado de comparar la lectura del dispositivo contra el pin de la parada.
 *
 * Solo tres estados porque `isVisitable` ya descarto todo lo demas: quien
 * llega aca ya sabe que la parada es un cliente pendiente con pin.
 */
export type VisitGate =
  | { status: 'ready'; distanceMeters: number }
  | { status: 'too-far'; distanceMeters: number }
  /** Todavia no hay lectura de GPS, o el vendedor nego el permiso. */
  | { status: 'no-fix' };

/**
 * La regla del radio, sola y sobre metros.
 *
 * Esta separada de `visitGate` porque es la unica forma de fijarla con un
 * test: construir un par de coordenadas que disten *exactamente* 80m es
 * imposible en punto flotante, asi que un test que lo intente pasa igual con
 * `<` que con `<=` -- comprobado. Sobre metros, `isWithinRadius(80)` es
 * decidible y la mutacion se cae.
 *
 * `<=` y no `<`: la API trata el radio exacto como adentro (hay un test suyo
 * que lo fija), y las dos puntas tienen que coincidir o el boton habilitado
 * mandaria algo que el servidor marca fuera de rango.
 */
export function isWithinRadius(distanceMeters: number): boolean {
  return distanceMeters <= GPS_RADIUS_METERS;
}

/**
 * Decide si el vendedor esta lo bastante cerca para confirmar.
 *
 * Igual no coinciden al milimetro: aca se usa Haversine (esfera) y el servidor
 * usa `ST_Distance` sobre el esferoide, que difieren en torno al 0.5% -- unos
 * 40cm a 80m. Justo en el borde el cliente puede habilitar y el servidor
 * responder `within_radius: false`. Es aceptable por diseño: el servidor
 * guarda `distance_meters` calculado por el, que es el dato autoritativo, y el
 * panel puede ver la inconsistencia.
 */
export function visitGate(
  stopLocation: Coordinates,
  deviceLocation: Coordinates | null,
): VisitGate {
  if (deviceLocation === null) return { status: 'no-fix' };

  const distanceMeters = haversineMeters(deviceLocation, stopLocation);

  return isWithinRadius(distanceMeters)
    ? { status: 'ready', distanceMeters }
    : { status: 'too-far', distanceMeters };
}

/**
 * El texto que ve el vendedor para cada estado de la compuerta.
 *
 * Vive aca y no en el componente para que el texto de CA2 -- el "notifica el
 * motivo" -- quede cubierto por un test en vez de depender de leer el JSX.
 * "Acércate al cliente para validar" sale literal del wireframe (pantalla 5).
 */
export function visitGateMessage(gate: VisitGate): string {
  switch (gate.status) {
    case 'ready':
      return `Dentro del rango · a ${formatDistance(gate.distanceMeters)} del cliente`;
    case 'too-far':
      return `Acércate al cliente para validar · a ${formatDistance(gate.distanceMeters)}`;
    case 'no-fix':
      return 'Sin señal GPS todavía. Revisá los permisos de ubicación.';
  }
}
