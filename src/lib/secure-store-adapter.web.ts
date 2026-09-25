/**
 * Web no usa `localStorage` para la sesión.
 *
 * `expo-secure-store` no existe en el navegador y el fallback anterior escribía
 * el access token y el refresh token en `localStorage`. Eso se queda en disco
 * y cualquier script de la página puede leerlo.
 *
 * Hasta que PragmaCRM-Api fije la sesión en cookies HttpOnly, la sesión web
 * vive solo en memoria: sobrevive al ruteo de la pestaña y se pierde al
 * recargar. No es un cliente de cookies. Cuando la API mande `Set-Cookie`,
 * este adaptador tiene que dejar de guardar el JWT y pasar a esa sesión.
 *
 * Al cargar se borran las llaves `sb-*-auth-token` que ya estuvieran en
 * `localStorage`, para no seguir leyendo un token viejo.
 */

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};

const memory = new Map<string, string>();

export function isLegacyAuthTokenKey(key: string): boolean {
  return key.startsWith('sb-') && key.endsWith('-auth-token');
}

/** Quita tokens de Supabase que una versión anterior guardó en `localStorage`. */
export function purgeLegacyAuthTokens(storage: KeyValueStore | null | undefined): void {
  if (!storage) return;
  const stale: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isLegacyAuthTokenKey(key)) stale.push(key);
  }
  for (const key of stale) storage.removeItem(key);
}

export function createMemoryAuthStorage(): KeyValueStore {
  return {
    get length() {
      return memory.size;
    },
    key(index: number) {
      return Array.from(memory.keys())[index] ?? null;
    },
    getItem(key: string) {
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
    },
  };
}

const browserStorage = typeof localStorage === 'undefined' ? null : localStorage;
purgeLegacyAuthTokens(browserStorage);

const sessionMemory = createMemoryAuthStorage();

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    return sessionMemory.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    sessionMemory.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    sessionMemory.removeItem(key);
  },
};
