import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayBadge } from '@/components/day-badge';
import { RouteMap, type RouteMapHandle } from '@/components/route-map';
import { ScreenHeader } from '@/components/screen-header';
import { StopsSheet, type StopsSheetState } from '@/components/stops-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import type { DailyRouteStop } from '@/lib/daily-route';
import { dayTiming, formatDayHeading, summarizeDay } from '@/lib/weekly-route-format';
import { useWeeklyRouteStore } from '@/stores/weekly-route-store';

const NO_STOPS: DailyRouteStop[] = [];

/**
 * Vista previa de la ruta de un dia (wireframe 16, PCRM-170): el mismo mapa y
 * la misma hoja de paradas que la ruta de hoy, pero de solo lectura. Sin GPS
 * del vendedor (sin punto azul ni distancias) y sin "Validar visita" ni
 * "Establecer ubicación": eso es de la ruta de hoy, no de la planificacion.
 *
 * Lee el dia del store que ya cargo el calendario; no hace su propia llamada.
 * Solo si se llega aca sin semana cargada (p. ej. tras un cambio de sesion) la
 * pide.
 */
export default function DayPreviewScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const week = useWeeklyRouteStore((state) => state.week);
  const refreshing = useWeeklyRouteStore((state) => state.refreshing);
  const loadWeek = useWeeklyRouteStore((state) => state.loadWeek);
  const routeMapRef = useRef<RouteMapHandle>(null);
  const stopsSheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);

  useEffect(() => {
    if (week.status === 'idle') void loadWeek();
  }, [week.status, loadWeek]);

  const day =
    week.status === 'ready' ? week.week.days.find((d) => String(d.day) === dayParam) : undefined;
  const stops = day?.stops ?? NO_STOPS;

  const sheetState: StopsSheetState =
    week.status === 'error'
      ? { status: 'error', message: week.error.message }
      : day
        ? { status: 'ready', stops }
        : { status: 'loading' };

  const timing = day && week.status === 'ready' ? dayTiming(day, week.week.today) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title={day ? formatDayHeading(day) : 'Ruta del día'}
          subtitle={day ? summarizeDay(day) : undefined}
        />

        {!day ? (
          <View style={styles.centered}>
            {week.status === 'error' ? (
              <>
                <ThemedText themeColor="textSecondary" style={styles.centeredText}>
                  {week.error.message}
                </ThemedText>
                <Button title="Reintentar" onPress={() => void loadWeek()} />
              </>
            ) : week.status === 'ready' ? (
              <ThemedText themeColor="textSecondary">Ese día no está en la semana.</ThemedText>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        ) : (
          <>
            <View style={styles.mapContainer}>
              <RouteMap ref={routeMapRef} stops={stops} currentLocation={null} />
              {timing ? (
                <View style={styles.badge}>
                  <DayBadge timing={timing} />
                </View>
              ) : null}
            </View>

            <View style={styles.bottomBar}>
              <Button
                title={`▲ Ver paradas (${stops.length})`}
                onPress={() => stopsSheetRef.current?.present()}
              />
            </View>
          </>
        )}
      </SafeAreaView>

      {/*
        Tocar una tarjeta cierra la hoja y enfoca su pin: en la vista previa no
        hay detalle del cliente ni acciones, el mapa es lo que se quiere ver.
      */}
      <StopsSheet
        ref={stopsSheetRef}
        state={sheetState}
        title="Paradas del día"
        emptyMessage="Este día no tiene paradas asignadas."
        refreshing={refreshing}
        onReload={() => void loadWeek()}
        currentLocation={null}
        onStopPress={(stop) => {
          stopsSheetRef.current?.dismiss();
          routeMapRef.current?.focusStop(stop.id);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
  },
  bottomBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
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
