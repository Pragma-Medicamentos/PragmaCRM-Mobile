import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initAuth, useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/*
        La sesion se rehidrata desde el almacenamiento cifrado de forma
        asincrona. Renderizar el navegador antes de saber el resultado muestra
        la pantalla de login por un instante en cada arranque en frio, incluso
        para un usuario que si tiene sesion. Mientras tanto el splash nativo
        sigue arriba porque nadie ha llamado a hideAsync todavia.
      */}
      {status !== 'loading' && (
        <>
          <AnimatedSplashOverlay />
          <RootNavigator signedIn={status === 'signedIn'} />
        </>
      )}
    </ThemeProvider>
  );
}

/**
 * Compuerta de sesion: la decision es sincrona y binaria, sin red. Cuando un
 * guard pasa de true a false, expo-router redirige y descarta el historial de
 * ese grupo, que es justo lo que se necesita al cerrar sesion.
 */
function RootNavigator({ signedIn }: { signedIn: boolean }) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
