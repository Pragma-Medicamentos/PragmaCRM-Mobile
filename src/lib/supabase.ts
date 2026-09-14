import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SecureStoreAdapter } from './secure-store-adapter';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n' +
      'Copia .env.example a .env.local y pega los valores del dashboard de Supabase\n' +
      '(Project Settings > API Keys: usa la publishable key sb_publishable_..., no la anon).\n' +
      'Despues reinicia el servidor de desarrollo: las variables EXPO_PUBLIC_ se inlinean al compilar.',
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // No hay callback por URL: la app no tiene OAuth ni recuperacion por enlace.
    detectSessionInUrl: false,
  },
});

// supabase-js refresca el token con un temporizador propio, y iOS y Android lo
// congelan al mandar la app al fondo. Sin esto, volver despues de una hora deja
// un access token vencido. Se registra una sola vez, al importar el modulo.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
