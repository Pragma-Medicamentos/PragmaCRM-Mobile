import type { StopType, TargetKind } from './daily-route';

/**
 * Que pin le toca a una parada en el mapa (PCRM-49).
 *
 * Vive suelto y sin imports de React Native para que la precedencia de abajo
 * quede cubierta por un test: es una regla facil de romper sin darse cuenta.
 */
export type StopPinKind = StopType | 'prospect';

/**
 * El destino gana sobre el tipo de parada.
 *
 * Un prospecto trae `stop_type` igual que cualquier otra parada (el admin lo
 * agenda como Visita, Despacho o Cobro), asi que sin esta precedencia se
 * pintaria con el pin verde/azul/ambar y quedaria indistinguible de un
 * cliente -- que es exactamente lo que PCRM-49 viene a resolver.
 */
export function stopPinKind(stop: { stop_type: StopType; target_kind: TargetKind }): StopPinKind {
  return stop.target_kind === 'prospect' ? 'prospect' : stop.stop_type;
}
