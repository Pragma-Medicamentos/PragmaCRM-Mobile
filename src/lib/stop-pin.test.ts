import assert from 'node:assert/strict';
import { test } from 'node:test';

import { stopPinKind } from './stop-pin.ts';

test('un cliente usa el pin de su tipo de parada', () => {
  assert.equal(stopPinKind({ target_kind: 'customer', stop_type: 'visit' }), 'visit');
  assert.equal(stopPinKind({ target_kind: 'customer', stop_type: 'dispatch' }), 'dispatch');
  assert.equal(stopPinKind({ target_kind: 'customer', stop_type: 'collection' }), 'collection');
});

test('un prospecto usa el pin de prospecto sin importar su tipo de parada', () => {
  // La invariante de PCRM-49: el admin agenda al prospecto como Visita,
  // Despacho o Cobro igual que a un cliente, asi que el `stop_type` no alcanza
  // para distinguirlo. Si alguien invierte la precedencia, estos tres fallan.
  assert.equal(stopPinKind({ target_kind: 'prospect', stop_type: 'visit' }), 'prospect');
  assert.equal(stopPinKind({ target_kind: 'prospect', stop_type: 'dispatch' }), 'prospect');
  assert.equal(stopPinKind({ target_kind: 'prospect', stop_type: 'collection' }), 'prospect');
});
