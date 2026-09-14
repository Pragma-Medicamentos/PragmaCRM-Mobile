/**
 * expo-secure-store no existe en web. El navegador cae a localStorage, que es
 * lo que supabase-js usa por defecto en esa plataforma de todos modos.
 *
 * El guard de `typeof localStorage` cubre el prerenderizado estatico
 * (`app.json: web.output = "static"`), que corre en Node y no tiene la API.
 */
const available = () => typeof localStorage !== 'undefined';

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    return available() ? localStorage.getItem(key) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (available()) localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (available()) localStorage.removeItem(key);
  },
};
