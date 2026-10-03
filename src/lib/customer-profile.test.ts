import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatCreditLimit, personalityKey, potentialKey } from './customer-profile.ts';

test('personalidad: acepta los cuatro colores en minusculas', () => {
  for (const color of ['rojo', 'amarillo', 'verde', 'azul']) {
    assert.equal(personalityKey(color), color);
  }
});

test('personalidad: tolera mayusculas y espacios de carga manual', () => {
  assert.equal(personalityKey(' Rojo '), 'rojo');
  assert.equal(personalityKey('AZUL'), 'azul');
});

test('personalidad: un valor desconocido o vacio no pinta nada', () => {
  assert.equal(personalityKey('morado'), null);
  assert.equal(personalityKey(''), null);
  assert.equal(personalityKey(null), null);
});

test('potencial: normaliza alto, medio y bajo', () => {
  assert.equal(potentialKey('alto'), 'alto');
  assert.equal(potentialKey('Medio'), 'medio');
  assert.equal(potentialKey('bajo '), 'bajo');
  assert.equal(potentialKey('altisimo'), null);
  assert.equal(potentialKey(null), null);
});

test('limite de credito: dolares con dos decimales', () => {
  assert.equal(formatCreditLimit(1500), '$1,500.00');
  assert.equal(formatCreditLimit(0), '$0.00');
  assert.equal(formatCreditLimit(null), null);
});
