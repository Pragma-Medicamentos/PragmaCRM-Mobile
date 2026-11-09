import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pendingStopsFirst } from './stop-progress.ts';
import { sortStopsForSheet } from './stop-sort.ts';

const VENDEDOR = { lat: 13.7, lng: -89.2 };
const COMPLETADA = '2026-11-09T15:10:00.000Z';

// Sobre el mismo meridiano: la distancia crece con la latitud.
function stop(id: string, latOffset: number | null, completed_at: string | null = null) {
  return {
    id,
    completed_at,
    location: latOffset === null ? null : { lat: VENDEDOR.lat + latOffset, lng: VENDEDOR.lng },
  };
}

const ids = (stops: { id: string }[]) => stops.map((s) => s.id);

test('ordena las pendientes de la mas cercana a la mas lejana', () => {
  const stops = [stop('lejos', 0.05), stop('cerca', 0.001), stop('medio', 0.01)];
  assert.deepEqual(ids(sortStopsForSheet(stops, VENDEDOR)), ['cerca', 'medio', 'lejos']);
});

test('las completadas quedan al final aunque esten mas cerca, en orden del backend', () => {
  const stops = [
    stop('hecha-b', 0.0001, COMPLETADA),
    stop('pendiente', 0.05),
    stop('hecha-a', 0.00001, COMPLETADA),
  ];
  assert.deepEqual(ids(sortStopsForSheet(stops, VENDEDOR)), ['pendiente', 'hecha-b', 'hecha-a']);
});

test('las pendientes sin GPS van despues de las que tienen, antes de las completadas', () => {
  const stops = [
    stop('sin-gps-1', null),
    stop('hecha', 0.001, COMPLETADA),
    stop('con-gps', 0.05),
    stop('sin-gps-2', null),
  ];
  assert.deepEqual(ids(sortStopsForSheet(stops, VENDEDOR)), [
    'con-gps',
    'sin-gps-1',
    'sin-gps-2',
    'hecha',
  ]);
});

test('sin origen queda igual que pendingStopsFirst', () => {
  const stops = [stop('a', 0.05, COMPLETADA), stop('b', 0.01), stop('c', null), stop('d', 0.001)];
  assert.deepEqual(sortStopsForSheet(stops, null), pendingStopsFirst(stops));
});

test('ante empate respeta el orden del backend', () => {
  const stops = [stop('primera', 0.01), stop('segunda', 0.01), stop('tercera', 0.01)];
  assert.deepEqual(ids(sortStopsForSheet(stops, VENDEDOR)), ['primera', 'segunda', 'tercera']);
});

test('no muta el arreglo recibido', () => {
  const stops = [stop('lejos', 0.05), stop('cerca', 0.001)];
  sortStopsForSheet(stops, VENDEDOR);
  assert.deepEqual(ids(stops), ['lejos', 'cerca']);
});
