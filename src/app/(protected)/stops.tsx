import { ScrollView, StyleSheet, View } from 'react-native';

import { StopCard } from '@/components/stop-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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

  // Si se llega aca sin una ruta lista (navegacion directa, por ejemplo) se
  // degrada a lista vacia en vez de romper: el boton que empuja a esta
  // pantalla ya solo aparece con `route.status === 'ready'`.
  const stops = route.status === 'ready' ? route.route.stops : [];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBorder, { backgroundColor: theme.text }]} />

      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.handleRow}>
        <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
      </View>

      <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
        <ThemedText type="default">Paradas de hoy ({stops.length})</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {stops.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No tenés paradas asignadas hoy.
          </ThemedText>
        ) : (
          stops.map((stop) => <StopCard key={stop.id} stop={stop} />)
        )}
      </ScrollView>
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
});
