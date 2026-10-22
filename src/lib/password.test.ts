import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PASSWORD_MIN_LENGTH, validateNewPassword } from './password.ts';

test('una contraseña mas corta que el minimo se bloquea', () => {
  const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
  assert.match(validateNewPassword(short, short) ?? '', /al menos 8 caracteres/);
  assert.match(validateNewPassword('', '') ?? '', /al menos 8 caracteres/);
});

test('si la confirmacion no coincide se bloquea', () => {
  assert.equal(validateNewPassword('secreta123', 'secreta124'), 'Las contraseñas no coinciden.');
  assert.equal(validateNewPassword('secreta123', ''), 'Las contraseñas no coinciden.');
});

test('el largo se revisa antes que la coincidencia', () => {
  assert.match(validateNewPassword('corta', 'otra') ?? '', /al menos/);
});

test('una contraseña valida y confirmada pasa', () => {
  assert.equal(validateNewPassword('secreta123', 'secreta123'), undefined);
  assert.equal(validateNewPassword('a'.repeat(PASSWORD_MIN_LENGTH), 'a'.repeat(PASSWORD_MIN_LENGTH)), undefined);
});

test('los espacios cuentan: no se recortan', () => {
  assert.equal(validateNewPassword(' secreta1', 'secreta1'), 'Las contraseñas no coinciden.');
  assert.equal(validateNewPassword(' secreta1', ' secreta1'), undefined);
});
