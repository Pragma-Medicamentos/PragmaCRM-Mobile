import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RouteHistoryDay } from '@/lib/route-history';
import {
  formatHistoryDate,
  historyRouteNames,
  summarizeHistoryDay,
  summarizeSkipped,
} from '@/lib/route-history-format';
import { useRouteHistoryStore } from '@/stores/route-history-store';

/**
 * Historial de rutas (wireframe 14, PCRM-203): los dias ya ejecutados del
 * vendedor, del mas reciente al mas viejo, con cuantas paradas completo.
 * Solo lectura: tocar un dia abre su detalle.
 *
 * Se refresca al ganar foco, como el calendario: una parada marcada ayer a
 * ultima hora aparece al volver a entrar. Al llegar al final se pide la
 * pagina siguiente.
 */
export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const history = useRouteHistoryStore((state) => state.history);
  const refreshing = useRouteHistoryStore((state) => state.refreshing);
  const loadingMore = useRouteHistoryStore((state) => state.loadingMore);
  const loadMoreError = useRouteHistoryStore((state) => state.loadMoreError);
  const loadHistory = useRouteHistoryStore((state) => state.loadHistory);
  const loadMore = useRouteHistoryStore((state) => state.loadMore);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Historial de rutas" />

        {history.status === 'idle' || history.status === 'pending' ? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        ) : history.status === 'error' ? (
          <View style={styles.centered}>
            <ThemedText type="subtitle" style={styles.centeredText}>
              No se pudo cargar el historial
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centeredText}>
              {history.error.message}
            </ThemedText>
            <Button title="Reintentar" onPress={() => void loadHistory()} />
          </View>
        ) : (
          <FlatList
            data={history.days}
            keyExtractor={(day) => day.date}
            contentContainerStyle={[
              styles.list,
              history.days.length === 0 && styles.listEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadHistory()}
                tintColor={theme.tint}
                colors={[theme.tint]}
              />
            }
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <HistoryDayCard
                day={item}
                onPress={() =>
                  router.push({ pathname: '/history/[day]', params: { day: item.date } })
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.centered}>
                <ThemedText type="subtitle" style={styles.centeredText}>
                  Todavía no hay rutas en tu historial
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centeredText}>
                  Aquí verás cada día de ruta que ya pasó, con las paradas que completaste.
                </ThemedText>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.footer} />
              ) : loadMoreError ? (
                <View style={styles.footer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
                    {loadMoreError}
                  </ThemedText>
                  <Button title="Cargar más" variant="outline" onPress={() => void loadMore()} />
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

type HistoryDayCardProps = {
  day: RouteHistoryDay;
  onPress: () => void;
};

/** Tarjeta de un dia: fecha, ruta, "4/5 completadas" y las omitidas. */
function HistoryDayCard({ day, onPress }: HistoryDayCardProps) {
  const theme = useTheme();
  const title = formatHistoryDate(day.date);
  const routes = historyRouteNames(day);
  const summary = summarizeHistoryDay(day);
  const skipped = summarizeSkipped(day);
  const allDone = day.skipped === 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${routes}, ${summary}${skipped ? `, ${skipped}` : ''}`}
      accessibilityHint="Muestra las paradas del día"
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.text, backgroundColor: theme.background },
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <ThemedText type="smallBold" style={styles.cardTitle}>
            {title}
          </ThemedText>
          <ThemedText
            type="smallBold"
            style={{ color: allDone ? theme.tint : theme.textSecondary }}>
            {summary}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {routes}
        </ThemedText>
        {skipped ? (
          <ThemedText type="small" style={{ color: theme.danger }} numberOfLines={2}>
            {skipped}
          </ThemedText>
        ) : null}
      </View>

      <ThemedText type="heading">›</ThemedText>
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
  listEmpty: {
    flexGrow: 1,
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
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    flexShrink: 1,
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
  footer: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
});
