import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterStopsByName, normalizeSearchText } from './stop-search.ts';

const STOPS = [
  { id: '1', name: 'Farmacia San José', trade_name: null },
  { id: '2', name: 'Droguería Vida Nueva', trade_name: 'Drog. Vida Nueva' },
  { id: '3', name: 'Inversiones Peña S.A. de C.V.', trade_name: 'Farmacia La Fe' },
];

const ids = (stops: { id: string }[]) => stops.map((s) => s.id);

test('normaliza mayusculas, tildes y espacios de los bordes', () => {
  assert.equal(normalizeSearchText('  Droguería JOSÉ  '), 'drogueria jose');
  assert.equal(normalizeSearchText('Peña'), 'pena');
});

test('no distingue mayusculas', () => {
  assert.deepEqual(ids(filterStopsByName(STOPS, 'SAN JOSE')), ['1']);
});

test('no distingue tildes en ninguno de los dos sentidos', () => {
  assert.deepEqual(ids(filterStopsByName(STOPS, 'san jose')), ['1']);
  assert.deepEqual(ids(filterStopsByName(STOPS, 'drogueria')), ['2']);
  assert.deepEqual(ids(filterStopsByName(STOPS, 'vída')), ['2']);
});

test('tambien busca en el nombre comercial', () => {
  assert.deepEqual(ids(filterStopsByName(STOPS, 'la fe')), ['3']);
});

test('busca por subcadena y respeta el orden recibido', () => {
  assert.deepEqual(ids(filterStopsByName(STOPS, 'farmacia')), ['1', '3']);
});

test('con la busqueda vacia o en blanco devuelve todas', () => {
  assert.deepEqual(ids(filterStopsByName(STOPS, '')), ['1', '2', '3']);
  assert.deepEqual(ids(filterStopsByName(STOPS, '   ')), ['1', '2', '3']);
});

test('sin coincidencias devuelve vacio', () => {
  assert.deepEqual(filterStopsByName(STOPS, 'xyz'), []);
});
