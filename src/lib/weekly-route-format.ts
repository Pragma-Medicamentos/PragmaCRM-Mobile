import type { StopType } from './daily-route';
import type { WeeklyRouteDay } from './weekly-route';

/**
 * Textos del calendario de rutas (wireframes 15 y 16). Vive suelto y sin
 * imports de React Native para que quede cubierto por tests.
 *
 * Las fechas llegan como `YYYY-MM-DD` y se leen por partes, nunca con
 * `new Date(iso)`: eso las interpreta como medianoche UTC y en El Salvador
 * (UTC−6) las corre al dia anterior.
 */

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Abreviaturas del wireframe: "31 ago", "5 sept". */
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const STOP_TYPE_ORDER: StopType[] = ['visit', 'dispatch', 'collection'];

const STOP_TYPE_COUNT_LABELS: Record<StopType, [string, string]> = {
  visit: ['Visita', 'Visitas'],
  dispatch: ['Despacho', 'Despachos'],
  collection: ['Cobro', 'Cobros'],
};

function parts(date: string): { day: number; month: number } {
  const [, month, day] = date.split('-').map(Number);
  return { day, month };
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Nombre del dia ISO (1 = lunes). */
export function weekdayName(day: number): string {
  return WEEKDAYS[day - 1] ?? '';
}

/** "Semana del 31 ago al 5 sept", o "Semana del 12 al 18 oct" en el mismo mes. */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = parts(weekStart);
  const end = parts(weekEnd);
  const startLabel =
    start.month === end.month ? `${start.day}` : `${start.day} ${MONTHS[start.month - 1]}`;
  return `Semana del ${startLabel} al ${end.day} ${MONTHS[end.month - 1]}`;
}

/** Titulo de la tarjeta del dia: "Lunes 31". */
export function formatDayTitle(day: WeeklyRouteDay): string {
  return `${weekdayName(day.day)} ${parts(day.date).day}`;
}

/** Encabezado de la vista previa: "Martes 1 sept". */
export function formatDayHeading(day: WeeklyRouteDay): string {
  const { day: dayOfMonth, month } = parts(day.date);
  return `${weekdayName(day.day)} ${dayOfMonth} ${MONTHS[month - 1]}`;
}

/**
 * "Zona Escalón · 6 paradas + 1 extra". Varias rutas el mismo dia se unen con
 * " + ". Las extras se cuentan aparte porque no son parte de la ruta
 * asignada: el admin las agrego para ese dia puntual.
 */
export function summarizeDay(day: WeeklyRouteDay): string {
  if (day.stops.length === 0) return 'Sin ruta asignada';

  const names = day.routes.map((route) => route.name).join(' + ');
  const extras = day.stops.filter((stop) => stop.is_extra).length;
  const planned = day.stops.length - extras;

  const counts: string[] = [];
  if (planned > 0) counts.push(plural(planned, 'parada', 'paradas'));
  if (extras > 0) counts.push(plural(extras, 'extra', 'extras'));

  return `${names} · ${counts.join(' + ')}`;
}

/** Zonas distintas de las rutas del dia, p. ej. "Escalón". Null si no hay. */
export function dayZones(day: WeeklyRouteDay): string | null {
  const zones = [...new Set(day.routes.map((route) => route.zone).filter(Boolean))];
  return zones.length > 0 ? zones.join(', ') : null;
}

/** "9 Visitas · 1 Despacho · 1 Cobro", solo con los tipos presentes. */
export function summarizeStopTypes(day: WeeklyRouteDay): string {
  return STOP_TYPE_ORDER.map((type) => {
    const count = day.stops.filter((stop) => stop.stop_type === type).length;
    const [singular, pluralForm] = STOP_TYPE_COUNT_LABELS[type];
    return count > 0 ? plural(count, singular, pluralForm) : null;
  })
    .filter((label): label is string => label !== null)
    .join(' · ');
}

export type DayTiming = 'past' | 'today' | 'upcoming';

/** Comparacion de texto: `YYYY-MM-DD` ordena igual que la fecha. */
export function dayTiming(day: WeeklyRouteDay, today: string): DayTiming {
  if (day.date === today) return 'today';
  return day.date < today ? 'past' : 'upcoming';
}

/**
 * Lunes a viernes siempre (el wireframe muestra la semana laboral completa,
 * con los dias libres como "Sin ruta asignada"); sabado y domingo solo si
 * tienen paradas, para no llenar la lista con dos dias vacios fijos.
 */
export function visibleDays(days: WeeklyRouteDay[]): WeeklyRouteDay[] {
  return days.filter((day) => day.day <= 5 || day.stops.length > 0);
}
