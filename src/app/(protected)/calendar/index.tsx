import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayBadge } from '@/components/day-badge';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WeeklyRouteDay } from '@/lib/weekly-route';
import {
  dayTiming,
  dayZones,
  formatDayTitle,
  formatWeekRange,
  summarizeDay,
  summarizeStopTypes,
  visibleDays,
} from '@/lib/weekly-route-format';
import { useWeeklyRouteStore } from '@/stores/weekly-route-store';

/**
 * Calendario de rutas (wireframe 15, PCRM-170): la semana en curso con la
 * ruta asignada de cada dia.
 *
 * Es un estado vivo, no historial: se pide de nuevo cada vez que la pantalla
 * gana foco, asi una reasignacion hecha en el panel web aparece al volver a
 * entrar o con pull-to-refresh.
 */
export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const week = useWeeklyRouteStore((state) => state.week);
  const refreshing = useWeeklyRouteStore((state) => state.refreshing);
  const loadWeek = useWeeklyRouteStore((state) => state.loadWeek);

  useFocusEffect(
    useCallback(() => {
      void loadWeek();
    }, [loadWeek]),
  );

  const subtitle =
    week.status === 'ready' ? formatWeekRange(week.week.week_start, week.week.week_end) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Calendario de rutas" />

        {week.status === 'idle' || week.status === 'pending' ? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        ) : week.status === 'error' ? (
          <View style={styles.centered}>
            <ThemedText type="subtitle" style={styles.centeredText}>
              No se pudo cargar la semana
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centeredText}>
              {week.error.message}
            </ThemedText>
            <Button title="Reintentar" onPress={() => void loadWeek()} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadWeek()}
                tintColor={theme.tint}
                colors={[theme.tint]}
              />
            }>
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>

            {visibleDays(week.week.days).map((day) => (
              <DayCard
                key={day.day}
                day={day}
                today={week.week.today}
                onPress={() =>
                  router.push({ pathname: '/calendar/[day]', params: { day: String(day.day) } })
                }
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

type DayCardProps = {
  day: WeeklyRouteDay;
  today: string;
  onPress: () => void;
};

/**
 * Tarjeta de un dia. Sin paradas queda atenuada y no se puede tocar ("Sin
 * ruta asignada"); hoy lleva el borde y el fondo verde del wireframe.
 */
function DayCard({ day, today, onPress }: DayCardProps) {
  const theme = useTheme();
  const timing = dayTiming(day, today);
  const isEmpty = day.stops.length === 0;
  const isToday = timing === 'today';
  const title = formatDayTitle(day);
  const summary = summarizeDay(day);
  const zones = dayZones(day);
  const types = summarizeStopTypes(day);

  return (
    <Pressable
      onPress={onPress}
      disabled={isEmpty}
      accessibilityRole={isEmpty ? 'summary' : 'button'}
      accessibilityLabel={`${title}${isToday ? ', hoy' : ''}, ${summary}`}
      accessibilityHint={isEmpty ? undefined : 'Muestra el mapa y las paradas del día'}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: isToday ? theme.tintBright : isEmpty ? theme.backgroundSelected : theme.text,
          backgroundColor: isToday ? withAlpha(theme.tintBright, 0.08) : theme.background,
        },
        isEmpty && styles.cardEmpty,
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardBody}>
        <ThemedText type="smallBold" themeColor={isEmpty ? 'textSecondary' : 'text'}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {summary}
        </ThemedText>
        {!isEmpty && (zones || types) ? (
          <ThemedText type="small" themeColor="textSecondary">
            {[zones ? `Zona: ${zones}` : null, types].filter(Boolean).join(' · ')}
          </ThemedText>
        ) : null}
      </View>

      {isToday ? <DayBadge timing="today" /> : null}
      {!isEmpty ? <ThemedText type="heading">›</ThemedText> : null}
    </Pressable>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  cardEmpty: {
    opacity: 0.7,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
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
