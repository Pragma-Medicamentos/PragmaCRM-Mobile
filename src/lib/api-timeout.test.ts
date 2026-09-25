import assert from 'node:assert/strict';
import { test } from 'node:test';

import { API_TIMEOUT_MESSAGE, armRequestTimeout, isTimeoutFailure } from './api-timeout.ts';

test('el temporizador aborta la señal con TimeoutError', async () => {
  const armed = armRequestTimeout(30);
  const reason = await new Promise<unknown>((resolve) => {
    armed.signal.addEventListener('abort', () => resolve(armed.signal.reason), { once: true });
  });

  assert.equal(armed.didTimeOut(), true);
  assert.ok(reason instanceof Error);
  assert.equal(reason.name, 'TimeoutError');
  assert.equal(isTimeoutFailure(reason, false), true);
  armed.clear();
});

test('desarmar el temporizador evita el abort y no deja la promesa colgada', async () => {
  const armed = armRequestTimeout(40);
  armed.clear();

  const aborted = await Promise.race([
    new Promise((resolve) => {
      armed.signal.addEventListener('abort', () => resolve(true), { once: true });
    }),
    new Promise((resolve) => setTimeout(() => resolve(false), 80)),
  ]);

  assert.equal(aborted, false);
  assert.equal(armed.didTimeOut(), false);
  assert.equal(isTimeoutFailure(new Error('red'), false), false);
  assert.equal(API_TIMEOUT_MESSAGE.length > 0, true);
});

test('la señal del llamador también aborta, sin contarlo como timeout', async () => {
  const caller = new AbortController();
  const armed = armRequestTimeout(5_000, caller.signal);
  caller.abort();

  assert.equal(armed.signal.aborted, true);
  assert.equal(armed.didTimeOut(), false);
  armed.clear();
});
