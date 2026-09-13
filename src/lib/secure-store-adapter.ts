import * as SecureStore from 'expo-secure-store';

/**
 * Almacenamiento cifrado (Keychain / Keystore) para la sesion de Supabase.
 *
 * iOS rechaza valores por encima de ~2048 bytes y una sesion serializada
 * (access JWT + refresh token + objeto de usuario) los supera con holgura, asi
 * que el valor se guarda partido en trozos numerados `${key}.0`, `${key}.1`, ...
 * y la cantidad de trozos vive bajo la llave base.
 *
 * Los JWT son base64url, de modo que contar caracteres equivale a contar bytes.
 */
const CHUNK_SIZE = 1800;

/** Techo de la barrida de limpieza cuando la cuenta de trozos se perdio. */
const MAX_CHUNKS = 64;

const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readChunkCount(key: string): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (raw === null) return null;

  const count = Number(raw);
  return Number.isInteger(count) && count > 0 ? count : null;
}

async function removeItem(key: string): Promise<void> {
  const count = await readChunkCount(key);
  await SecureStore.deleteItemAsync(key);

  if (count !== null) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    );
    return;
  }

  // Sin metadatos no se sabe cuantos trozos hay: o no habia nada guardado, o
  // una escritura se interrumpio antes de dejar la cuenta. Se barre hasta el
  // primer hueco para que los trozos huerfanos no se acumulen.
  for (let index = 0; index < MAX_CHUNKS; index += 1) {
    if ((await SecureStore.getItemAsync(chunkKey(key, index))) === null) break;
    await SecureStore.deleteItemAsync(chunkKey(key, index));
  }
}

async function getItem(key: string): Promise<string | null> {
  const count = await readChunkCount(key);
  if (count === null) return null;

  const parts = await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
  );

  if (parts.some((part) => part === null)) {
    // Una sesion a medias debe leerse como "no hay sesion", nunca como datos
    // corruptos que supabase-js intentaria interpretar.
    await removeItem(key);
    return null;
  }

  return parts.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  // El valor anterior pudo ocupar mas trozos que este; dejarlos atras haria que
  // getItem reensamblara una mezcla de sesion vieja y nueva.
  await removeItem(key);

  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
    chunks.push(value.slice(offset, offset + CHUNK_SIZE));
  }
  if (chunks.length === 0) chunks.push('');

  await Promise.all(
    chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)),
  );

  // La cuenta se escribe al final: hasta que exista, getItem reporta "no hay
  // sesion", de modo que un cierre abrupto a mitad de escritura deja al usuario
  // fuera en lugar de a medio entrar.
  await SecureStore.setItemAsync(key, String(chunks.length));
}

export const SecureStoreAdapter = { getItem, setItem, removeItem };
