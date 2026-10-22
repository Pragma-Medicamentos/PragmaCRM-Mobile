import type { DailyRouteStop } from './daily-route';
import type { RouteHistoryDay } from './route-history';

/**
 * Textos del historial de rutas (wireframe 14, PCRM-203). Suelto y sin
 * imports de React Native para que quede cubierto por tests, igual que
 * `weekly-route-format.ts`.
 *
 * Las fechas llegan como `YYYY-MM-DD` y se leen por partes: `new Date(iso)`
 * las interpreta como medianoche UTC y en El Salvador (UTC−6) las corre al
 * dia anterior.
 */

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function parts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

/**
 * "Martes 20 oct". El dia de la semana sale de la fecha calendario en UTC,
 * que es solo aritmetica: no hay hora que una zona pueda correr.
 */
export function formatHistoryDate(date: string): string {
  const { year, month, day } = parts(date);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${day} ${MONTHS[month - 1]}`;
}

/** "Zona Escalón", o "Zona Escalón + Santa Tecla" si hubo dos rutas. */
export function historyRouteNames(day: RouteHistoryDay): string {
  return day.routes.map((route) => route.name).join(' + ');
}

/** "4/5 completadas". */
export function summarizeHistoryDay(day: RouteHistoryDay): string {
  return `${day.completed}/${day.total} ${day.total === 1 ? 'completada' : 'completadas'}`;
}

/**
 * Las omitidas de la tarjeta: "Omitida: Drog. Vida Nueva", o con varias,
 * "2 omitidas: Drog. Vida Nueva, Farmacia La Fe". Null si no hubo.
 */
export function summarizeSkipped(day: RouteHistoryDay): string | null {
  if (day.skipped === 0) return null;
  const names = day.skipped_stops.map((stop) => stop.name).join(', ');
  return day.skipped === 1 ? `Omitida: ${names}` : `${day.skipped} omitidas: ${names}`;
}

/**
 * Une una pagina nueva a las que ya estan en pantalla. Se descarta un dia ya
 * presente: si entre dos paginas se marco una parada del limite, gana la
 * version que ya se ve en lugar de duplicar la tarjeta.
 */
export function appendHistoryPage(
  current: RouteHistoryDay[],
  page: RouteHistoryDay[],
): RouteHistoryDay[] {
  const seen = new Set(current.map((day) => day.date));
  return [...current, ...page.filter((day) => !seen.has(day.date))];
}

/**
 * Lo que paso con una parada de un dia pasado, para su tarjeta de solo
 * lectura: "Completada 9:10am · marcada a 12m del cliente", o "Sin marcar".
 * `formatTime` llega por parametro para que este archivo no dependa de `Intl`
 * con zona fija y siga siendo trivial de testear.
 */
export function describeHistoryStop(
  stop: Pick<DailyRouteStop, 'completed_at' | 'distance_meters'>,
  formatTime: (iso: string) => string,
  formatDistance: (meters: number) => string,
): string {
  if (!stop.completed_at) return 'Sin marcar';

  const time = `Completada ${formatTime(stop.completed_at)}`;
  const distance = stop.distance_meters ?? null;
  return distance === null ? time : `${time} · marcada a ${formatDistance(distance)} del cliente`;
}
