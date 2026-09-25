import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { ThemedView } from '@/components/themed-view';
import { needsPasswordSetup, ROLES } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

function Loading() {
  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator />
    </ThemedView>
  );
}

/**
 * Compuerta de autorizacion. La sesion ya fue verificada por el layout raiz;
 * aqui se resuelve quien es el usuario dentro del negocio, que es una pregunta
 * con red y por tanto con estados que no caben en un booleano.
 */
export default function ProtectedLayout() {
  const profile = useAuthStore((state) => state.profile);
  const loadProfile = useAuthStore((state) => state.loadProfile);
  const passwordSetup = useAuthStore((state) => state.passwordSetup);

  useEffect(() => {
    if (profile.status === 'idle') void loadProfile();
  }, [profile.status, loadProfile]);

  if (profile.status === 'idle' || profile.status === 'pending') return <Loading />;

  if (profile.status === 'error') {
    // Un 401 de sesion no llega hasta aqui: apiFetch refresca el token una
    // vez y, si sigue rechazado, cierra la sesion local. El guard raiz
    // devuelve al login. El 401 que si se queda es el de la compuerta
    // `x-api-key`, y cerrar sesion no lo arregla.
    if (profile.error.status === 401) {
      return (
        <AccessDenied
          title="No se pudo validar la solicitud"
          message="El servidor rechazó la petición antes de aceptar la sesión. Inténtalo de nuevo o vuelve a iniciar sesión."
          onRetry={() => void loadProfile()}
        />
      );
    }

    if (profile.error.status === 403) {
      return (
        <AccessDenied
          title="Cuenta no habilitada"
          message="Tu usuario aún no está habilitado para usar la aplicación. Contacta al administrador."
        />
      );
    }

    return (
      <AccessDenied
        title="No se pudo conectar"
        message={`${profile.error.message} Verifica tu conexión e inténtalo de nuevo.`}
        onRetry={() => void loadProfile()}
      />
    );
  }

  if (profile.me.role !== ROLES.SELLER) {
    return (
      <AccessDenied
        title="Acceso denegado"
        message="Esta aplicación es únicamente para vendedores. Ingresa al panel web con tu cuenta de administrador."
      />
    );
  }

  // Lo que esta sesion vio de primera mano gana sobre el perfil, en los dos
  // sentidos: `required` exige contraseña en una recuperacion, donde la columna
  // ya tiene fecha; `done` deja pasar despues de guardarla, sin esperar a que
  // `passwordSetAt` se refleje — si no, guardar la contraseña rebotaria de
  // vuelta a esta misma pantalla.
  const mustSetPassword =
    passwordSetup === 'required' ||
    (passwordSetup === 'idle' && needsPasswordSetup(profile.me));

  // `set-password` queda SIN guard a proposito. Si se protegiera con la
  // condicion inversa seria inalcanzable durante una recuperacion; dejandola
  // como unica pantalla disponible, el router cae en ella cuando la pantalla
  // de indice desaparece del guard, y eso la vuelve obligatoria sin ruta de
  // escape.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!mustSetPassword}>
        <Stack.Screen name="index" />
      </Stack.Protected>

      <Stack.Screen name="set-password" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
