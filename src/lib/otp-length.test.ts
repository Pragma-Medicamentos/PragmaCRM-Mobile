import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_OTP_LENGTH, resolveOtpLength } from './otp-length.ts';

test('sin variable de entorno el OTP usa 8 digitos', () => {
  assert.equal(resolveOtpLength(undefined), DEFAULT_OTP_LENGTH);
  assert.equal(resolveOtpLength(''), DEFAULT_OTP_LENGTH);
  assert.equal(resolveOtpLength('   '), DEFAULT_OTP_LENGTH);
  assert.equal(resolveOtpLength('no-es-numero'), DEFAULT_OTP_LENGTH);
  assert.equal(resolveOtpLength('0'), DEFAULT_OTP_LENGTH);
});

test('un entero positivo del entorno se respeta', () => {
  assert.equal(resolveOtpLength('6'), 6);
  assert.equal(resolveOtpLength(' 8 '), 8);
});
