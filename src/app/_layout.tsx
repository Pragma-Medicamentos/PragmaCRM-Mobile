import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { initAuth, useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync();

/**
 * react-navigation trae su propia paleta y es la que pinta los fondos y las
 * transiciones entre pantallas, no los componentes de la aplicacion. Sin este
 * puente, al empujar una pantalla se ve el azul de la plantilla por debajo.
 */
const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.backgroundSelected,
    notification: Colors.light.danger,
  },
};

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <ThemeProvider value={NavigationTheme}>
      {/*
        La aplicacion es siempre clara, asi que la barra de estado necesita
        contenido oscuro. Android usa iconos blancos por defecto y sobre el
        fondo blanco -- o sobre el verde claro del velo -- la hora y la bateria
        quedan practicamente invisibles.
      */}
      <StatusBar style="dark" />

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
