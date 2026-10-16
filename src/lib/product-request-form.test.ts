import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  normalizeProductName,
  parseQuantity,
  productRequestErrorMessage,
  validateProductRequest,
} from './product-request-form.ts';

test('el nombre se recorta y colapsa espacios como en el servidor', () => {
  assert.equal(normalizeProductName('  Ibuprofeno   400 mg '), 'Ibuprofeno 400 mg');
  assert.equal(normalizeProductName('\tJarabe\n infantil'), 'Jarabe infantil');
});

test('la cantidad vacia es opcional', () => {
  assert.equal(parseQuantity(''), undefined);
  assert.equal(parseQuantity('   '), undefined);
});

test('la cantidad acepta enteros y decimales con punto o coma', () => {
  assert.equal(parseQuantity('12'), 12);
  assert.equal(parseQuantity(' 2.5 '), 2.5);
  assert.equal(parseQuantity('2,5'), 2.5);
});

test('la cantidad rechaza cero, negativos, texto y montos fuera del tope', () => {
  assert.equal(parseQuantity('0'), null);
  assert.equal(parseQuantity('-3'), null);
  assert.equal(parseQuantity('doce'), null);
  assert.equal(parseQuantity('1.2.3'), null);
  assert.equal(parseQuantity('1000000000'), null);
});

test('un formulario valido devuelve lo que se manda a la API', () => {
  assert.deepEqual(validateProductRequest({ productName: ' Amoxicilina ', quantity: '3' }), {
    ok: true,
    value: { productName: 'Amoxicilina', requestedQuantity: 3 },
  });
  assert.deepEqual(validateProductRequest({ productName: 'Amoxicilina', quantity: '' }), {
    ok: true,
    value: { productName: 'Amoxicilina' },
  });
});

test('sin nombre el error apunta al campo del producto', () => {
  const result = validateProductRequest({ productName: '  a ', quantity: '3' });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.field, 'productName');
});

test('una cantidad invalida apunta a su campo', () => {
  const result = validateProductRequest({ productName: 'Amoxicilina', quantity: '0' });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.field, 'quantity');
});

test('los errores esperados de la API se traducen al español', () => {
  assert.equal(
    productRequestErrorMessage(422, 'Confirm the stop before registering an off-catalog product'),
    'Primero valida la visita para registrar productos.',
  );
  assert.equal(productRequestErrorMessage(403, 'x'), 'Esta parada no está asignada a ti.');
  assert.equal(productRequestErrorMessage(404, 'x'), 'La parada ya no existe. Actualiza la ruta.');
  assert.equal(
    productRequestErrorMessage(500, 'Internal server error'),
    'No se pudo registrar el producto. Intenta de nuevo.',
  );
});

test('sin conexion se conserva el mensaje en español de apiFetch', () => {
  assert.equal(
    productRequestErrorMessage(0, 'No se pudo conectar con el servidor.'),
    'No se pudo conectar con el servidor.',
  );
});
