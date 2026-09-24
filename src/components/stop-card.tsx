import { StyleSheet, View } from 'react-native';

import { StopBadge } from './stop-badge';
import { StopPill } from './stop-pill';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance, haversineMeters, type Coordinates } from '@/lib/distance';
import type { DailyRouteStop } from '@/lib/daily-route';
import { formatStopTime } from '@/lib/format-time';

type Props = {
  stop: DailyRouteStop;
  /**
   * Ubicacion actual del vendedor, para calcular la distancia a la parada.
   * Esta tarea no tiene GPS en vivo (eso es de la tarea 9, que agrega
   * `expo-location`): se deja el prop como semilla, sin valor por defecto, y
   * sin `location` en la parada se degrada igual que sin GPS.
   */
  currentLocation?: Coordinates | null;
};

/**
 * Arma el texto del subtitulo. `completada` gana siempre que la parada este
 * resuelta; si no, la distancia solo aparece cuando hay GPS de la parada Y
 * del vendedor -- sin cualquiera de los dos se degrada a mostrar solo la
 * zona (o el municipio, para el caso real de un prospecto sin zona).
 */
function buildSubtitle(stop: DailyRouteStop, currentLocation: Coordinates | null | undefined) {
  if (stop.completed_at) {
    return `completada ${formatStopTime(stop.completed_at)}`;
  }

  const place = stop.zone ?? stop.municipality;
  const distanceMeters =
    stop.location && currentLocation ? haversineMeters(currentLocation, stop.location) : null;

  if (place && distanceMeters !== null) {
    return `${place}, a ${formatDistance(distanceMeters)} ›`;
  }

  if (place) {
    return `${place} ›`;
  }

  return '›';
}

/** Tarjeta de una parada en la lista de la ruta diaria. */
export function StopCard({ stop, currentLocation }: Props) {
  const theme = useTheme();
  const isCompleted = stop.completed_at !== null;
  const subtitle = buildSubtitle(stop, currentLocation);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${stop.name}${isCompleted ? ', completada' : ''}, ${subtitle}`}
      style={[styles.card, { backgroundColor: theme.backgroundElement }, isCompleted && styles.completed]}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
          {stop.name}
          {isCompleted ? ' ✔' : ''}
        </ThemedText>
        <StopPill stopType={stop.stop_type} />
      </View>

      {stop.is_extra && (
        <View style={styles.badgeRow}>
          <StopBadge />
        </View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  completed: {
    opacity: 0.5,
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
  badgeRow: {
    flexDirection: 'row',
  },
});
