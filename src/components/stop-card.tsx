import { Pressable, StyleSheet, View } from 'react-native';

import { CustomerProfileRow } from './customer-profile-row';
import { ProspectPill } from './prospect-pill';
import { StopBadge } from './stop-badge';
import { Button } from './ui/button';
import { StopPill } from './stop-pill';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance, haversineMeters, type Coordinates } from '@/lib/distance';
import type { DailyRouteStop } from '@/lib/daily-route';
import { formatStopTime } from '@/lib/format-time';
import { isProspectStop } from '@/lib/stop-pin';
import { isVisitable, needsLocation } from '@/lib/visit-gate';

type Props = {
  stop: DailyRouteStop;
  /**
   * Ubicacion actual del vendedor, para calcular la distancia a la parada.
   * Esta tarea no tiene GPS en vivo (eso es de la tarea 9, que agrega
   * `expo-location`): se deja el prop como semilla, sin valor por defecto, y
   * sin `location` en la parada se degrada igual que sin GPS.
   */
  currentLocation?: Coordinates | null;
  /** Abre el detalle del cliente. Sin handler la tarjeta no es tocable. */
  onPress?: () => void;
} & StopActionProps;

type StopActionProps = {
  /**
   * Abre la hoja de validacion por GPS. El boton solo aparece cuando la
   * parada admite confirmarse (ver `isVisitable`): sin handler no se dibuja.
   */
  onValidatePress?: () => void;
  /**
   * Fija el pin de un cliente que no tiene (PCRM-160). Ocupa el lugar de
   * "Validar visita" mientras la parada no tenga ubicacion (ver
   * `needsLocation`): una vez fijada, la parada vuelve al flujo normal.
   */
  onSetLocationPress?: () => void;
  /** Mientras se lee el GPS y se guarda, el boton muestra el spinner. */
  settingLocation?: boolean;
};

/**
 * Arma el texto del subtitulo. `completada` gana siempre que la parada este
 * resuelta; si no, la distancia solo aparece cuando hay GPS de la parada Y
 * del vendedor -- sin cualquiera de los dos se degrada a mostrar solo la
 * zona (o el municipio, para el caso real de un prospecto sin zona).
 */
export function buildStopSubtitle(
  stop: DailyRouteStop,
  currentLocation: Coordinates | null | undefined,
) {
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

/**
 * El boton de accion de una parada: "Validar visita (GPS)" o, si el cliente
 * todavia no tiene pin, "Establecer ubicación". Es el mismo en la tarjeta y en
 * el detalle, para que las dos pantallas ofrezcan siempre lo mismo.
 */
export function StopAction({
  stop,
  onValidatePress,
  onSetLocationPress,
  settingLocation = false,
}: StopActionProps & { stop: DailyRouteStop }) {
  if (onValidatePress && isVisitable(stop)) {
    return <Button title="Validar visita (GPS)" onPress={onValidatePress} />;
  }

  if (onSetLocationPress && needsLocation(stop)) {
    return (
      <Button
        title="Establecer ubicación"
        variant="outline"
        onPress={onSetLocationPress}
        loading={settingLocation}
      />
    );
  }

  return null;
}

/** Tarjeta de una parada en la lista de la ruta diaria. */
export function StopCard({
  stop,
  currentLocation,
  onPress,
  onValidatePress,
  onSetLocationPress,
  settingLocation,
}: Props) {
  const theme = useTheme();
  const isCompleted = stop.completed_at !== null;
  const isProspect = isProspectStop(stop);
  const hasAction =
    (onValidatePress !== undefined && isVisitable(stop)) ||
    (onSetLocationPress !== undefined && needsLocation(stop));
  const subtitle = buildStopSubtitle(stop, currentLocation);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${stop.name}${isCompleted ? ', completada' : ''}, ${subtitle}`}
      accessibilityHint={onPress ? 'Muestra el detalle del cliente' : undefined}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        isCompleted && styles.completed,
        pressed && styles.pressed,
      ]}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
          {stop.name}
          {isCompleted ? ' ✔' : ''}
        </ThemedText>
        <StopPill stopType={stop.stop_type} />
      </View>

      {/* "Prospecto" va primero porque responde antes: "Extra" matiza como
          entro esta parada a la ruta, pero un prospecto es otra cosa -- un
          destino que todavia no es cliente. En la practica casi siempre se
          ven juntas (los prospectos llegan con `is_extra: true`), asi que la
          condicion de la fila mira las dos y no asume esa correlacion. */}
      {(isProspect || stop.is_extra) && (
        <View style={styles.badgeRow}>
          {isProspect && <ProspectPill />}
          {stop.is_extra && <StopBadge />}
        </View>
      )}

      <CustomerProfileRow stop={stop} />

      <ThemedText type="small" themeColor="textSecondary">
        {subtitle}
      </ThemedText>

      {/* Dentro del Pressable de la tarjeta, que es un boton: anidar otro
          boton es legal en RN (el hijo gana el toque) y evita partir la
          tarjeta en dos. `View` intermedio para que el boton no se estire a
          todo el ancho como haria `alignSelf: 'stretch'` del Button. */}
      {hasAction && (
        <View style={styles.actionRow}>
          <StopAction
            stop={stop}
            onValidatePress={onValidatePress}
            onSetLocationPress={onSetLocationPress}
            settingLocation={settingLocation}
          />
        </View>
      )}
    </Pressable>
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
  pressed: {
    opacity: 0.7,
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionRow: {
    paddingTop: Spacing.one,
  },
});
