/**
 * Web no guarda la sesión en `localStorage`.
 *
 * `expo-secure-store` no existe en el navegador. El adaptador anterior
 * escribía access token y refresh token ahí. Las cookies HttpOnly las cubren
 * Api #40 y Web #28; este archivo solo deja de persistir el JWT en
 * `localStorage`. La sesión de la pestaña queda en memoria y se pierde al
 * recargar. El adaptador nativo (Keychain / Keystore) no cambia.
 *
 * Al cargar se borran llaves `sb-*-auth-token` que ya estuvieran guardadas.
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

purgeLegacyAuthTokens(typeof localStorage === 'undefined' ? null : localStorage);

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    return memory.get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    memory.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    memory.delete(key);
  },
};
