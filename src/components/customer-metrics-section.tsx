import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import { useStopCustomerMetrics } from '@/hooks/use-stop-customer-metrics';
import { useTheme } from '@/hooks/use-theme';
import {
  CATEGORY_LABELS,
  formatDays,
  formatMetricDate,
  formatMoney,
  NO_DATA,
  type StopCustomerMetrics,
} from '@/lib/customer-metrics';
import type { DailyRouteStop } from '@/lib/daily-route';

type Props = {
  stop: DailyRouteStop;
};

/**
 * Metricas del cliente en el detalle de la parada (PCRM-164): lo que el
 * vendedor necesita para preparar la visita sin salir de la ruta.
 *
 * Son los mismos numeros del perfil en el panel web, calculados sobre los
 * ultimos 12 meses (la ventana de la categoria A/B/C). Un prospecto no tiene
 * ventas ni visitas que medir, asi que la seccion no se dibuja.
 */
export function CustomerMetricsSection({ stop }: Props) {
  const theme = useTheme();
  const { state, retry } = useStopCustomerMetrics(stop);

  if (stop.target_kind !== 'customer' || state.status === 'idle') return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="smallBold">Métricas del cliente</ThemedText>
        {state.status === 'ready' && (
          <View style={[styles.categoryPill, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small">{CATEGORY_LABELS[state.metrics.category]}</ThemedText>
          </View>
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Últimos 12 meses
      </ThemedText>

      {state.status === 'loading' && (
        <View style={[styles.placeholder, { backgroundColor: theme.backgroundElement }]}>
          <ActivityIndicator accessibilityLabel="Cargando métricas" />
        </View>
      )}

      {state.status === 'error' && (
        <View style={[styles.placeholder, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.errorText}>
            {state.message}
          </ThemedText>
          <Button title="Reintentar" variant="secondary" onPress={retry} />
        </View>
      )}

      {state.status === 'ready' && <MetricsBody metrics={state.metrics} />}
    </View>
  );
}

function MetricsBody({ metrics }: { metrics: StopCustomerMetrics }) {
  const theme = useTheme();
  const { summary, recent_notes: notes } = metrics;

  // Sin visitas comerciales el 0% de conversion diria "nunca le vende", que no
  // es lo mismo que "nunca se le visito".
  const conversion =
    summary.visits_count === 0
      ? NO_DATA
      : `${summary.conversion_rate}% de ${summary.visits_count} ${summary.visits_count === 1 ? 'visita' : 'visitas'}`;
  const frequency =
    summary.purchase_frequency_days === null
      ? NO_DATA
      : `Cada ${formatDays(summary.purchase_frequency_days)}`;

  return (
    <>
      <View style={styles.grid}>
        <MetricTile label="Compras netas" value={formatMoney(summary.net_purchases)} />
        <MetricTile label="Pedidos" value={String(summary.orders_count)} />
        <MetricTile label="Saldo pendiente" value={formatMoney(summary.pending_balance)} />
        <MetricTile label="Días promedio de pago" value={formatDays(summary.avg_payment_days)} />
        <MetricTile label="Conversión de visitas" value={conversion} />
        <MetricTile label="Frecuencia de compra" value={frequency} />
        <MetricTile label="Última compra" value={formatMetricDate(summary.last_purchase_at)} />
        <MetricTile label="Última visita" value={formatMetricDate(summary.last_visit_at)} />
      </View>

      {notes.length > 0 && (
        <View style={[styles.notes, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Notas recientes</ThemedText>
          {notes.map((note) => (
            <View key={`${note.date}-${note.notes}`} style={styles.note}>
              <ThemedText type="small" themeColor="textSecondary">
                {formatMetricDate(note.date)}
              </ThemedText>
              <ThemedText type="default">{note.notes}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value === NO_DATA ? 'sin datos' : value}`}
      style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  categoryPill: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  placeholder: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  errorText: {
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Dos por fila: con `flexGrow` el par llena el ancho sin calcular el gap.
  tile: {
    flexBasis: '40%',
    flexGrow: 1,
    gap: Spacing.half,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  notes: {
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  note: {
    gap: Spacing.half,
  },
});
