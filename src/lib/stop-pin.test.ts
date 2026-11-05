import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isProspectStop, stopPinKind } from './stop-pin.ts';

const PENDIENTE = { completed_at: null };
const COMPLETADA = { completed_at: '2026-10-30T15:10:00.000Z' };

test('un cliente usa el pin de su tipo de parada', () => {
  assert.equal(stopPinKind({ ...PENDIENTE, target_kind: 'customer', stop_type: 'visit' }), 'visit');
  assert.equal(
    stopPinKind({ ...PENDIENTE, target_kind: 'customer', stop_type: 'dispatch' }),
    'dispatch',
  );
  assert.equal(
    stopPinKind({ ...PENDIENTE, target_kind: 'customer', stop_type: 'collection' }),
    'collection',
  );
});

test('un prospecto usa el pin de prospecto sin importar su tipo de parada', () => {
  // La invariante de PCRM-49: el admin agenda al prospecto como Visita,
  // Despacho o Cobro igual que a un cliente, asi que el `stop_type` no alcanza
  // para distinguirlo. Si alguien invierte la precedencia, estos tres fallan.
  assert.equal(stopPinKind({ ...PENDIENTE, target_kind: 'prospect', stop_type: 'visit' }), 'prospect');
  assert.equal(
    stopPinKind({ ...PENDIENTE, target_kind: 'prospect', stop_type: 'dispatch' }),
    'prospect',
  );
  assert.equal(
    stopPinKind({ ...PENDIENTE, target_kind: 'prospect', stop_type: 'collection' }),
    'prospect',
  );
});

test('una parada completada usa el pin gris sin importar tipo ni destino', () => {
  // Completada gana incluso sobre prospecto: si el chequeo de `completed_at`
  // queda despues del de destino, el ultimo caso falla.
  assert.equal(stopPinKind({ ...COMPLETADA, target_kind: 'customer', stop_type: 'visit' }), 'completed');
  assert.equal(
    stopPinKind({ ...COMPLETADA, target_kind: 'customer', stop_type: 'dispatch' }),
    'completed',
  );
  assert.equal(
    stopPinKind({ ...COMPLETADA, target_kind: 'customer', stop_type: 'collection' }),
    'completed',
  );
  assert.equal(stopPinKind({ ...COMPLETADA, target_kind: 'prospect', stop_type: 'visit' }), 'completed');
});

test('isProspectStop distingue el destino, no el tipo de parada', () => {
  // Es el predicado del que cuelgan las tres lecturas que el vendedor ve
  // (pin del mapa, pildora del mapa, pildora de la tarjeta), asi que se
  // prueba solo y no solo a traves de `stopPinKind`.
  assert.equal(isProspectStop({ target_kind: 'prospect' }), true);
  assert.equal(isProspectStop({ target_kind: 'customer' }), false);
});
