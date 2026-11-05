import type { StopType, TargetKind } from './daily-route';

/**
 * Que pin le toca a una parada en el mapa (PCRM-49).
 *
 * Vive suelto y sin imports de React Native para que la precedencia de abajo
 * quede cubierta por un test: es una regla facil de romper sin darse cuenta.
 */
export type StopPinKind = StopType | 'prospect' | 'completed';

/**
 * Si el destino de la parada es un prospecto y no un cliente.
 *
 * Existe como funcion, y no como un `=== 'prospect'` suelto en cada
 * componente, porque hoy son tres los lugares que tienen que coincidir: el
 * pin del mapa, la pildora del mapa y la pildora de la tarjeta. Si uno dice
 * que si y otro que no, el vendedor ve un pin de prospecto sin nombre o un
 * nombre sin pin.
 */
export function isProspectStop(stop: { target_kind: TargetKind }): boolean {
  return stop.target_kind === 'prospect';
}

/**
 * Completada gana sobre todo; despues, el destino gana sobre el tipo de parada.
 *
 * Una parada ya completada va siempre con el pin gris, sea del tipo que sea y
 * aunque sea un prospecto: en el mapa lo que importa de ella es que ya esta
 * hecha, para que el vendedor vea de un vistazo lo que le falta.
 *
 * Un prospecto trae `stop_type` igual que cualquier otra parada (el admin lo
 * agenda como Visita, Despacho o Cobro), asi que sin esta precedencia se
 * pintaria con el pin verde/azul/ambar y quedaria indistinguible de un
 * cliente -- que es exactamente lo que PCRM-49 viene a resolver.
 */
export function stopPinKind(stop: {
  stop_type: StopType;
  target_kind: TargetKind;
  completed_at: string | null;
}): StopPinKind {
  if (stop.completed_at !== null) return 'completed';
  return isProspectStop(stop) ? 'prospect' : stop.stop_type;
}
