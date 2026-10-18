import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatDays, formatMetricDate, formatMoney, NO_DATA } from './customer-metrics.ts';

test('dinero: formatea el string de la API como dolares', () => {
  assert.equal(formatMoney('1520.40'), '$1,520.40');
  assert.equal(formatMoney('0.00'), '$0.00');
});

test('dinero: un valor ilegible no se inventa', () => {
  assert.equal(formatMoney('no-es-numero'), NO_DATA);
});

test('dias: singular, plural y sin dato', () => {
  assert.equal(formatDays(1), '1 día');
  assert.equal(formatDays(38), '38 días');
  assert.equal(formatDays(0), '0 días');
  assert.equal(formatDays(null), NO_DATA);
});

test('fecha: usa el dia de El Salvador, no el UTC', () => {
  // 03:00 UTC del 1 de octubre todavia es 30 de septiembre en El Salvador.
  const formatted = formatMetricDate('2026-10-01T03:00:00.000Z');
  assert.match(formatted, /^30 sep/);
  assert.match(formatted, /2026$/);
});

test('fecha: sin fecha o ilegible muestra el guion', () => {
  assert.equal(formatMetricDate(null), NO_DATA);
  assert.equal(formatMetricDate('no-es-fecha'), NO_DATA);
});
