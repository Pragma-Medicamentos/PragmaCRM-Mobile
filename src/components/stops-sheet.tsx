import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useEffect, useMemo, type ComponentRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { StopCard } from './stop-card';
import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import type { DailyRouteStop } from '@/lib/daily-route';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import { useRouteStore } from '@/stores/route-store';

/**
 * Hoja de paradas, migrada de una ruta (`/stops` con `presentation: 'formSheet'`)
 * a este componente sobre `@gorhom/bottom-sheet`. Ver el comentario en
 * `(protected)/index.tsx` (donde se monta) para el porque del cambio de arquitectura.
 *
 * Son entre cinco y diez paradas por dia (el tope real de un vendedor), asi
 * que `BottomSheetScrollView` con `.map()` alcanza: un `BottomSheetFlatList`
 * sumaria una segunda dimension de scroll (virtualizacion) sin beneficio a
 * este tamaño.
 */
type Props = {
  /** Se llama al tocar una tarjeta con GPS; las que no tienen quedan inertes. */
  onStopPress?: (stop: DailyRouteStop) => void;
};

export const StopsSheet = forwardRef<ComponentRef<typeof BottomSheetModal>, Props>(function StopsSheet(
  { onStopPress },
  ref,
) {
  const theme = useTheme();
  const route = useRouteStore((state) => state.route);
  const loadRoute = useRouteStore((state) => state.loadRoute);
  // R12: esta hoja abre su propia suscripcion de ubicacion (independiente de
  // la del mapa en (protected)/index.tsx -- ver el comentario de
  // useDeviceLocation) para poder mostrar distancia en cada tarjeta. Con
  // permiso denegado o sin fix todavia, `location` queda en null y
  // StopCard ya sabe degradar a `{zona} ›` sin romperse.
  const { location } = useDeviceLocation();

  // `idle` solo pasa por el primer render de la app (antes de que
  // (protected)/index.tsx dispare `loadRoute()` al montar). Se repite el
  // mismo patron aca en vez de asumir que la otra pantalla ya la pidio, para
  // que esta hoja tambien funcione si en el futuro se abre desde otro lugar.
  useEffect(() => {
    if (route.status === 'idle') void loadRoute();
  }, [route.status, loadRoute]);

  const snapPoints = useMemo(() => ['68%'], []);

  // El conteo del encabezado no se puede calcular fuera de `ready`: mostrar
  // "(0)" mientras todavia esta cargando o mientras fallo es la misma mentira
  // de fondo vacio que R11 corrige mas abajo, solo que en miniatura.
  const headerLabel =
    route.status === 'ready' ? `Paradas de hoy (${route.route.stops.length})` : 'Paradas de hoy';

  // Mismo grabber armado a mano que tenia `stops.tsx`: `handleIndicatorStyle`
  // de gorhom es un solo elemento y no alcanza para reproducir el borde
  // superior de 3px del wireframe, asi que se arma el handle completo aca.
  const renderHandle = useCallback(
    () => (
      <View>
        <View style={[styles.topBorder, { backgroundColor: theme.text }]} />
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
        </View>
      </View>
    ),
    [theme],
  );

  // Sin velo oscuro (`opacity={0}`): el mapa tiene que seguir visible detras
  // de la hoja, igual que con `sheetLargestUndimmedDetentIndex: 0` en la
  // version de ruta. `pressBehavior="close"` conserva el toque-afuera-cierra
  // que traia el formSheet nativo.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleComponent={renderHandle}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.background, { backgroundColor: theme.background }]}>
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
      ) : route.route.stops.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          No tenés paradas asignadas hoy.
        </ThemedText>
      ) : (
        <BottomSheetScrollView contentContainerStyle={styles.list}>
          {route.route.stops.map((stop) => (
            <StopCard
              key={stop.id}
              stop={stop}
              currentLocation={location}
              onPress={onStopPress && stop.location ? () => onStopPress(stop) : undefined}
            />
          ))}
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    paddingHorizontal: Spacing.three,
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
