import { useAuth, useClerk } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { ThemedView } from '@/components/themed-view';
import { useMe } from '@/hooks/use-me';
import { ROLES } from '@/lib/api';

function Loading() {
  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator />
    </ThemedView>
  );
}

function SessionExpired() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut();
  }, [signOut]);

  return <Loading />;
}

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const state = useMe();

  // Clerk restores the session from the token cache asynchronously; rendering
  // anything before that flashes the sign-in screen on every cold start.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/" />;

  if (state.status === 'pending') return <Loading />;

  if (state.status === 'error') {
    // 401 means the session itself is gone, which signing in again fixes.
    // Every other failure does not, so it must not bounce to the login screen.
    if (state.error.status === 401) return <SessionExpired />;

    if (state.error.status === 403) {
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
        message={`${state.error.message} Verifica tu conexión e inténtalo de nuevo.`}
      />
    );
  }

  if (state.me.role !== ROLES.SELLER) {
    return (
      <AccessDenied
        title="Acceso denegado"
        message="Esta aplicación es únicamente para vendedores. Ingresa al panel web con tu cuenta de administrador."
      />
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
