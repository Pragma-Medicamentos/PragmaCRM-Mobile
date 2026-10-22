import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RouteHistoryDay } from './route-history.ts';
import {
  appendHistoryPage,
  describeHistoryStop,
  formatHistoryDate,
  historyRouteNames,
  summarizeHistoryDay,
  summarizeSkipped,
} from './route-history-format.ts';

const route = (name: string) => ({
  id: name,
  route_user_id: `ru-${name}`,
  name,
  municipality: null,
  zone: null,
});

const day = (overrides: Partial<RouteHistoryDay> = {}): RouteHistoryDay => ({
  date: '2026-10-20',
  routes: [route('Zona Escalón')],
  total: 5,
  completed: 5,
  skipped: 0,
  skipped_stops: [],
  ...overrides,
});

const time = (iso: string) => `t(${iso})`;
const distance = (meters: number) => `${meters}m`;

test('la fecha lleva el dia de la semana correcto, sin correrse por la zona horaria', () => {
  assert.equal(formatHistoryDate('2026-10-20'), 'Martes 20 oct');
  assert.equal(formatHistoryDate('2026-08-31'), 'Lunes 31 ago');
  assert.equal(formatHistoryDate('2026-11-01'), 'Domingo 1 nov');
});

test('las rutas del dia se unen con +', () => {
  assert.equal(historyRouteNames(day()), 'Zona Escalón');
  assert.equal(
    historyRouteNames(day({ routes: [route('Zona Escalón'), route('Santa Tecla')] })),
    'Zona Escalón + Santa Tecla',
  );
});

test('el resumen cuenta completadas sobre el total', () => {
  assert.equal(summarizeHistoryDay(day({ completed: 4 })), '4/5 completadas');
  assert.equal(summarizeHistoryDay(day({ total: 1, completed: 1 })), '1/1 completada');
});

test('sin omitidas no hay linea de omitidas', () => {
  assert.equal(summarizeSkipped(day()), null);
});

test('una omitida se nombra; varias se cuentan y se nombran', () => {
  assert.equal(
    summarizeSkipped(
      day({
        completed: 4,
        skipped: 1,
        skipped_stops: [{ id: 'a', name: 'Drog. Vida Nueva', stop_type: 'visit' }],
      }),
    ),
    'Omitida: Drog. Vida Nueva',
  );
  assert.equal(
    summarizeSkipped(
      day({
        completed: 3,
        skipped: 2,
        skipped_stops: [
          { id: 'a', name: 'Drog. Vida Nueva', stop_type: 'visit' },
          { id: 'b', name: 'Farmacia La Fe', stop_type: 'collection' },
        ],
      }),
    ),
    '2 omitidas: Drog. Vida Nueva, Farmacia La Fe',
  );
});

test('una pagina nueva se agrega al final sin duplicar dias', () => {
  const merged = appendHistoryPage(
    [day({ date: '2026-10-21' }), day({ date: '2026-10-20' })],
    [day({ date: '2026-10-20', completed: 1 }), day({ date: '2026-10-19' })],
  );

  assert.deepEqual(
    merged.map((d) => [d.date, d.completed]),
    [
      ['2026-10-21', 5],
      ['2026-10-20', 5],
      ['2026-10-19', 5],
    ],
  );
});

test('una parada sin marcar se describe como tal', () => {
  assert.equal(
    describeHistoryStop({ completed_at: null, distance_meters: null }, time, distance),
    'Sin marcar',
  );
});

test('una parada completada lleva la hora y la distancia del marcado', () => {
  assert.equal(
    describeHistoryStop(
      { completed_at: '2026-10-20T15:10:00.000Z', distance_meters: 12 },
      time,
      distance,
    ),
    'Completada t(2026-10-20T15:10:00.000Z) · marcada a 12m del cliente',
  );
});

test('sin distancia (backend anterior) queda solo la hora', () => {
  assert.equal(
    describeHistoryStop({ completed_at: '2026-10-20T15:10:00.000Z' }, time, distance),
    'Completada t(2026-10-20T15:10:00.000Z)',
  );
});
