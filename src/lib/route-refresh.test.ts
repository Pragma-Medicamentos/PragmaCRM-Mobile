import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RESUME_RELOAD_THRESHOLD_MS, shouldReloadOnResume } from './route-refresh.ts';

const NOW = Date.UTC(2026, 9, 17, 6, 5);

test('sin una carga registrada se recarga', () => {
  assert.equal(shouldReloadOnResume(null, NOW), true);
});

test('volver al frente dentro del umbral no recarga', () => {
  assert.equal(shouldReloadOnResume(NOW, NOW), false);
  assert.equal(shouldReloadOnResume(NOW - 5_000, NOW), false);
  assert.equal(shouldReloadOnResume(NOW - RESUME_RELOAD_THRESHOLD_MS, NOW), false);
});

test('pasado el umbral se recarga', () => {
  assert.equal(shouldReloadOnResume(NOW - RESUME_RELOAD_THRESHOLD_MS - 1, NOW), true);
  // La app quedo en segundo plano toda la noche.
  assert.equal(shouldReloadOnResume(NOW - 8 * 60 * 60 * 1000, NOW), true);
});
