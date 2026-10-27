import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countPendingStops, pendingStopsFirst } from './stop-progress.ts';

const pending = (id: string) => ({ id, completed_at: null });
const done = (id: string) => ({ id, completed_at: '2026-10-27T15:10:00.000Z' });

test('sin visitas marcadas, todas las paradas estan pendientes', () => {
  assert.equal(countPendingStops([pending('a'), pending('b'), pending('c')]), 3);
});

test('el conteo baja con cada visita completada', () => {
  assert.equal(countPendingStops([done('a'), pending('b'), pending('c')]), 2);
  assert.equal(countPendingStops([done('a'), done('b'), pending('c')]), 1);
  assert.equal(countPendingStops([done('a'), done('b'), done('c')]), 0);
});

test('una ruta vacia no tiene pendientes', () => {
  assert.equal(countPendingStops([]), 0);
});

test('las completadas pasan al final', () => {
  const ids = pendingStopsFirst([done('a'), pending('b'), done('c'), pending('d')]).map(
    (stop) => stop.id,
  );
  assert.deepEqual(ids, ['b', 'd', 'a', 'c']);
});

test('cada grupo conserva el orden del backend', () => {
  const ids = pendingStopsFirst([
    pending('1'),
    done('2'),
    pending('3'),
    done('4'),
    pending('5'),
    done('6'),
  ]).map((stop) => stop.id);
  assert.deepEqual(ids, ['1', '3', '5', '2', '4', '6']);
});

test('sin completadas el orden no cambia', () => {
  const stops = [pending('a'), pending('b'), pending('c')];
  assert.deepEqual(pendingStopsFirst(stops), stops);
});

test('no muta el arreglo original', () => {
  const stops = [done('a'), pending('b')];
  pendingStopsFirst(stops);
  assert.deepEqual(
    stops.map((stop) => stop.id),
    ['a', 'b'],
  );
});
