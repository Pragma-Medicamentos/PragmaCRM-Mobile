import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { StopCard } from '@/components/stop-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import { useRouteStore } from '@/stores/route-store';

/**
 * Hoja de paradas: `presentation: 'formSheet'` (declarado en `_layout.tsx`)
 * ya da el radio, el grabber nativo y el traspaso de scroll/pan. El grabber
 * y el borde de arriba de aca abajo son de todas formas necesarios porque
 * `sheetGrabberVisible` es solo de iOS -- en Android, donde `formSheet` cae
 * a un modal comun, esta es la unica señal visual de que hay una hoja.
 *
 * Son entre cinco y diez paradas por dia (el tope real de un vendedor), asi
 * que un `ScrollView` con `.map()` alcanza: un `FlatList` sumaria una
 * segunda dimension de scroll (virtualizacion) sin beneficio a este tamaño.
 */
export default function StopsScreen() {
  const theme = useTheme();
  const route = useRouteStore((state) => state.route);
  const loadRoute = useRouteStore((state) => state.loadRoute);
  // R12: esta hoja abre su propia suscripcion de ubicacion (independiente de
  // la del mapa en (tabs)/index.tsx -- ver el comentario de
  // useDeviceLocation) para poder mostrar distancia en cada tarjeta. Con
  // permiso denegado o sin fix todavia, `location` queda en null y
  // StopCard ya sabe degradar a `{zona} ›` sin romperse.
  const { location } = useDeviceLocation();

  // `idle` solo pasa por navegacion directa a esta pantalla (deep link, por
  // ejemplo): el boton que empuja aca en (tabs)/index.tsx ya solo aparece con
  // `route.status === 'ready'`, y esa misma pantalla ya dispara `loadRoute()`
  // al montar si la encuentra en `idle`. Se repite el mismo patron aca en vez
  // de asumir que la otra pantalla ya la pidio, para que esta hoja tambien
  // funcione sola.
  useEffect(() => {
    if (route.status === 'idle') void loadRoute();
  }, [route.status, loadRoute]);

  // El conteo del encabezado no se puede calcular fuera de `ready`: mostrar
  // "(0)" mientras todavia esta cargando o mientras fallo es la misma mentira
  // de fondo vacio que R11 corrige mas abajo, solo que en miniatura.
  const headerLabel =
    route.status === 'ready' ? `Paradas de hoy (${route.route.stops.length})` : 'Paradas de hoy';

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBorder, { backgroundColor: theme.text }]} />

      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.handleRow}>
        <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
      </View>

      <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
        <ThemedText type="default">{headerLabel}</ThemedText>
      </View>

      {route.status === 'idle' || route.status === 'pending' ? (
        // Mismo componente que `_layout.tsx` usa para su propia carga
        // (`ActivityIndicator` centrado, sin texto): la primera carga de la
        // ruta es la misma clase de espera con red que la del perfil.
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : route.status === 'error' ? (
        // Mismo par "mensaje + reintentar" que `access-denied.tsx`, pero sin
        // reusar el componente entero: `AccessDenied` es una pantalla
        // completa con su propio `SafeAreaView` y un boton de cerrar sesion
        // que no aplica dentro de esta hoja (la sesion aca es valida, lo que
        // fallo fue pedir la ruta).
        <View style={styles.centered}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            No se pudo cargar la ruta
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {route.error.message}
          </ThemedText>
          <Button title="Reintentar" onPress={() => void loadRoute()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {route.route.stops.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No tenés paradas asignadas hoy.
            </ThemedText>
          ) : (
            route.route.stops.map((stop) => (
              <StopCard key={stop.id} stop={stop} currentLocation={location} />
            ))
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBorder: {
    height: 3,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: Spacing.half,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    paddingTop: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centeredText: {
    textAlign: 'center',
  },
});
