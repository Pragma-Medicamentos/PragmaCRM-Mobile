import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DailyRouteStop, StopType } from './daily-route.ts';
import type { WeeklyRouteDay } from './weekly-route.ts';
import {
  dayTiming,
  dayZones,
  formatDayHeading,
  formatDayTitle,
  formatWeekRange,
  summarizeDay,
  summarizeStopTypes,
  visibleDays,
} from './weekly-route-format.ts';

const route = (name: string, zone: string | null = null) => ({
  id: name,
  route_user_id: `ru-${name}`,
  name,
  municipality: null,
  zone,
});

const stop = (stopType: StopType, isExtra = false): DailyRouteStop =>
  ({ stop_type: stopType, is_extra: isExtra }) as DailyRouteStop;

const day = (overrides: Partial<WeeklyRouteDay> = {}): WeeklyRouteDay => ({
  day: 1,
  date: '2026-08-31',
  routes: [],
  stops: [],
  ...overrides,
});

test('el rango de la semana nombra los dos meses cuando cruza de mes', () => {
  assert.equal(formatWeekRange('2026-08-31', '2026-09-06'), 'Semana del 31 ago al 6 sept');
});

test('el rango de la semana nombra el mes una sola vez dentro del mismo mes', () => {
  assert.equal(formatWeekRange('2026-10-12', '2026-10-18'), 'Semana del 12 al 18 oct');
});

test('el titulo del dia no se corre un dia por zona horaria', () => {
  // new Date('2026-09-01') seria el 31 de agosto en El Salvador.
  assert.equal(formatDayTitle(day({ day: 2, date: '2026-09-01' })), 'Martes 1');
  assert.equal(formatDayHeading(day({ day: 2, date: '2026-09-01' })), 'Martes 1 sept');
});

test('un dia sin paradas dice "Sin ruta asignada"', () => {
  assert.equal(summarizeDay(day()), 'Sin ruta asignada');
});

test('el resumen cuenta paradas planificadas y extras por separado', () => {
  const summary = summarizeDay(
    day({
      routes: [route('Zona Sur')],
      stops: [...Array.from({ length: 6 }, () => stop('visit')), stop('collection', true)],
    }),
  );
  assert.equal(summary, 'Zona Sur · 6 paradas + 1 extra');
});

test('el resumen usa singular y une varias rutas del mismo dia', () => {
  const summary = summarizeDay(
    day({
      routes: [route('Zona Sur'), route('Zona Norte')],
      stops: [stop('visit'), stop('visit', true), stop('dispatch', true)],
    }),
  );
  assert.equal(summary, 'Zona Sur + Zona Norte · 1 parada + 2 extras');
});

test('un dia solo con extras no muestra "0 paradas"', () => {
  const summary = summarizeDay(day({ routes: [route('Zona Sur')], stops: [stop('visit', true)] }));
  assert.equal(summary, 'Zona Sur · 1 extra');
});

test('las zonas se listan sin repetir y se omiten las vacias', () => {
  const zones = dayZones(
    day({ routes: [route('A', 'Escalón'), route('B', 'Escalón'), route('C', null)] }),
  );
  assert.equal(zones, 'Escalón');
  assert.equal(dayZones(day({ routes: [route('C', null)] })), null);
});

test('el conteo por tipo sigue el orden Visita, Despacho, Cobro y omite los ausentes', () => {
  const types = summarizeStopTypes(
    day({ stops: [stop('collection'), stop('visit'), stop('visit')] }),
  );
  assert.equal(types, '2 Visitas · 1 Cobro');
});

test('el momento del dia se calcula contra el hoy del servidor', () => {
  assert.equal(dayTiming(day({ date: '2026-10-14' }), '2026-10-14'), 'today');
  assert.equal(dayTiming(day({ date: '2026-10-13' }), '2026-10-14'), 'past');
  assert.equal(dayTiming(day({ date: '2026-10-15' }), '2026-10-14'), 'upcoming');
});

test('lunes a viernes siempre se muestran; sabado y domingo solo con paradas', () => {
  const week = [1, 2, 3, 4, 5, 6, 7].map((n) =>
    day({ day: n, stops: n === 6 ? [stop('visit')] : [] }),
  );
  assert.deepEqual(
    visibleDays(week).map((d) => d.day),
    [1, 2, 3, 4, 5, 6],
  );
});
