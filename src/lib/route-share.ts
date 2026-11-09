import { formatHistoryDate } from './route-history-format.ts';

type RouteShareInput = {
  /** `DailyRoute.date`, `YYYY-MM-DD`. */
  date: string;
  /** Paradas que entraron al link (`GoogleMapsLink.included`). */
  included: number;
  url: string;
};

/**
 * Texto del boton de compartir junto a "Abrir ruta en maps":
 * "Ruta de hoy · Lunes 9 nov (8 paradas):" y el link en la linea siguiente.
 * El link va dentro del mensaje y no aparte porque Android ignora la `url`
 * de `Share.share`. Cuenta las paradas del link, no las del dia: arriba de
 * diez el link solo lleva las proximas (ver `google-maps-link.ts`).
 */
export function buildRouteShareMessage({ date, included, url }: RouteShareInput): string {
  const count = `${included} ${included === 1 ? 'parada' : 'paradas'}`;
  return `Ruta de hoy · ${formatHistoryDate(date)} (${count}):\n${url}`;
}
