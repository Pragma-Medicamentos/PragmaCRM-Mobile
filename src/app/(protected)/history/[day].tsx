import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProspectPill } from '@/components/prospect-pill';
import { ScreenHeader } from '@/components/screen-header';
import { StopBadge } from '@/components/stop-badge';
import { StopPill } from '@/components/stop-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { fetchDailyRoute, type DailyRoute, type DailyRouteStop } from '@/lib/daily-route';
import { formatDistance } from '@/lib/distance';
import { formatStopTime } from '@/lib/format-time';
import { describeHistoryStop, formatHistoryDate } from '@/lib/route-history-format';
import { isProspectStop } from '@/lib/stop-pin';

type DayState =
  | { status: 'pending' }
  | { status: 'ready'; route: DailyRoute }
  | { status: 'error'; message: string };

/**
 * Detalle de un dia del historial (PCRM-203): sus paradas con la hora y la
 * distancia a la que se marco cada una, y la nota de la visita. Es la ruta de
 * ese dia (`GET /me/route?date=`) en solo lectura: sin "Validar visita", sin
 * nota ni GPS, porque RF-07 solo deja escribir la nota el mismo dia.
 *
 * Pide su propio dia y no pasa por un store: no hay otra pantalla que lo
 * comparta, y un dia pasado no cambia mientras se mira.
 */
export default function HistoryDayScreen() {
  const { day: date } = useLocalSearchParams<{ day: string }>();
  const theme = useTheme();
  const [attempt, setAttempt] = useState(0);
  // Mismo patron que `use-stop-customer-metrics`: cada resultado guarda la
  // peticion a la que responde, y mientras no coincida con la actual se esta
  // cargando. El efecto solo escribe estado cuando llega la respuesta.
  const [ready, setReady] = useState<{ key: string; route: DailyRoute } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${date}|${attempt}`;

  useEffect(() => {
    let cancelled = false;

    fetchDailyRoute(date).then(
      (route) => {
        if (!cancelled) setReady({ key, route });
      },
      (error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
        setFailure({ key, message });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [date, key]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  // Un refresco, aunque falle, no tira el dia que ya estaba en pantalla.
  const loading = ready?.key !== key && failure?.key !== key;
  const state: DayState = ready
    ? { status: 'ready', route: ready.route }
    : failure?.key === key
      ? { status: 'error', message: failure.message }
      : { status: 'pending' };
  const refreshing = ready !== null && loading;

  const stops = state.status === 'ready' ? state.route.stops : [];
  const completed = stops.filter((stop) => stop.completed_at !== null).length;
  const routeNames =
    state.status === 'ready' ? state.route.routes.map((route) => route.name).join(' + ') : '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title={date ? formatHistoryDate(date) : 'Ruta del día'}
          subtitle={
            state.status === 'ready' && stops.length > 0
              ? `${routeNames} · ${completed}/${stops.length} completadas`
              : undefined
          }
        />

        {state.status === 'pending' ? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        ) : state.status === 'error' ? (
          <View style={styles.centered}>
            <ThemedText type="subtitle" style={styles.centeredText}>
              No se pudo cargar el día
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centeredText}>
              {state.message}
            </ThemedText>
            <Button title="Reintentar" onPress={reload} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, stops.length === 0 && styles.listEmpty]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={reload}
                tintColor={theme.tint}
                colors={[theme.tint]}
              />
            }>
            {stops.length === 0 ? (
              <View style={styles.centered}>
                <ThemedText themeColor="textSecondary" style={styles.centeredText}>
                  Este día no tiene paradas.
                </ThemedText>
              </View>
            ) : (
              stops.map((stop, index) => (
                <HistoryStopCard key={stop.id} stop={stop} position={index + 1} />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Tarjeta de solo lectura de una parada pasada. Una parada sin marcar va
 * tachada, como en la lista de paradas (wireframes 3 y 14).
 */
function HistoryStopCard({ stop, position }: { stop: DailyRouteStop; position: number }) {
  const theme = useTheme();
  const isCompleted = stop.completed_at !== null;
  const isProspect = isProspectStop(stop);
  const outcome = describeHistoryStop(stop, formatStopTime, formatDistance);
  const place = stop.zone ?? stop.municipality ?? stop.address;
  const notes = stop.notes ?? null;

  return (
    <View
      accessible
      accessibilityLabel={`Parada ${position}, ${stop.name}, ${outcome}${notes ? `, nota: ${notes}` : ''}`}
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.headerRow}>
        <ThemedText
          type="smallBold"
          style={[styles.name, !isCompleted && styles.skippedName]}
          themeColor={isCompleted ? 'text' : 'textSecondary'}
          numberOfLines={1}>
          {stop.name}
          {isCompleted ? ' ✔' : ''}
        </ThemedText>
        <StopPill stopType={stop.stop_type} />
      </View>

      {(isProspect || stop.is_extra) && (
        <View style={styles.badgeRow}>
          {isProspect && <ProspectPill />}
          {stop.is_extra && <StopBadge />}
        </View>
      )}

      {place ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          📍 {place}
        </ThemedText>
      ) : null}

      <ThemedText
        type="small"
        style={{ color: isCompleted ? theme.tint : theme.danger }}>
        {outcome}
      </ThemedText>

      {notes ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nota: {notes}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  list: {
    gap: Spacing.two + Spacing.one,
    padding: Spacing.three,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  skippedName: {
    textDecorationLine: 'line-through',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
