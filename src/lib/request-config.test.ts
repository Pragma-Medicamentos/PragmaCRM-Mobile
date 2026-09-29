import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildApiHeaders,
  isApiKeyRejection,
  isSessionUnauthorized,
} from './request-config.ts';

test('una llamada protegida siempre manda Bearer y no deja que el llamador lo quite', () => {
  const headers = buildApiHeaders('gate', 'jwt-1', {
    Authorization: 'Bearer otro',
    'x-api-key': 'distinta',
    'Content-Type': 'application/json',
  });

  assert.equal(headers.get('Authorization'), 'Bearer jwt-1');
  assert.equal(headers.get('x-api-key'), 'gate');
  assert.equal(headers.get('Content-Type'), 'application/json');
});

test('sin Content-Type el cliente pone JSON', () => {
  const headers = buildApiHeaders('gate', 'jwt-1');
  assert.equal(headers.get('Content-Type'), 'application/json');
});

test('401 de api key no se trata como sesion vencida', () => {
  const message = 'Invalid or missing API key';
  assert.equal(isApiKeyRejection(401, message), true);
  assert.equal(isSessionUnauthorized(401, message), false);
  assert.equal(isSessionUnauthorized(401, 'jwt expired'), true);
  assert.equal(isSessionUnauthorized(403, 'Forbidden'), false);
});
