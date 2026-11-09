import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildRouteShareMessage } from './route-share.ts';

const URL = 'https://www.google.com/maps/dir/?api=1&destination=13.7,-89.2&travelmode=driving';

test('lleva la fecha de la ruta, el conteo y el link al final', () => {
  assert.equal(
    buildRouteShareMessage({ date: '2026-11-09', included: 8, url: URL }),
    `Ruta de hoy · Lunes 9 nov (8 paradas):\n${URL}`,
  );
});

test('una sola parada va en singular', () => {
  assert.equal(
    buildRouteShareMessage({ date: '2026-11-10', included: 1, url: URL }),
    `Ruta de hoy · Martes 10 nov (1 parada):\n${URL}`,
  );
});
