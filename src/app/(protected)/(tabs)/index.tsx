import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useRouteStore } from '@/stores/route-store';

export default function HomeScreen() {
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const route = useRouteStore((state) => state.route);
  const loadRoute = useRouteStore((state) => state.loadRoute);

  // El layout de `(protected)` no renderiza esta pantalla hasta tener el
  // perfil, asi que aqui siempre esta listo.
  const me = profile.status === 'ready' ? profile.me : null;

  // Nadie mas dispara la primera carga de la ruta diaria: esta pantalla es
  // el unico punto de entrada hoy. La tarea 9 la reemplaza por un fetch
  // atado al mapa (con polling); por ahora alcanza con pedirla al montar.
  useEffect(() => {
    if (route.status === 'idle') void loadRoute();
  }, [route.status, loadRoute]);

  // Boton temporal para poder demostrar la lista de paradas (PCRM-48) sin el
  // mapa todavia. La tarea 9 reescribe esta pantalla entera y lo quita.
  const stopCount = route.status === 'ready' ? route.route.stops.length : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.centered}>
          Hola, {me?.name ?? 'vendedor'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          {me?.email ?? 'Bienvenido a PragmaCRM'}
        </ThemedText>

        {stopCount !== null && (
          <Button title={`▲ Ver paradas (${stopCount})`} onPress={() => router.push('/stops')} />
        )}

        <Button title="Cerrar sesión" variant="secondary" onPress={() => void signOut()} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
});
