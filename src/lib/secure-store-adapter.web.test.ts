import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isLegacyAuthTokenKey, purgeLegacyAuthTokens } from './secure-store-adapter.web.ts';

test('una llave de sesion de supabase en localStorage se reconoce', () => {
  assert.equal(isLegacyAuthTokenKey('sb-abc-auth-token'), true);
  assert.equal(isLegacyAuthTokenKey('otra-cosa'), false);
});

test('purge borra solo tokens de auth y no escribe uno nuevo', () => {
  const written: string[] = [];
  const store = new Map<string, string>([
    ['sb-project-auth-token', 'jwt'],
    ['preferencia-ui', 'claro'],
  ]);
  const storage = {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      written.push(key);
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };

  purgeLegacyAuthTokens(storage);

  assert.equal(store.has('sb-project-auth-token'), false);
  assert.equal(store.get('preferencia-ui'), 'claro');
  assert.deepEqual(written, []);
  purgeLegacyAuthTokens(null);
});
