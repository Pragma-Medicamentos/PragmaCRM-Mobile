import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing, StopTypeColorsByType } from '@/constants/theme';
import type { StopType } from '@/lib/daily-route';
import { STOP_TYPE_EMOJI, STOP_TYPE_LABELS } from '@/lib/stop-type';

type Props = {
  stopType: StopType;
};

/**
 * Pildora de tipo de parada (Visita / Despacho / Cobro) de la tarjeta de ruta.
 *
 * Lleva el mismo emoji que el chip del pin seleccionado en el mapa
 * (`StopTypeIcon`), para que la lista y el mapa nombren el tipo igual. El
 * texto se queda: el emoji lo dibuja la fuente del sistema y nunca puede ser
 * el unico portador del dato (ver `STOP_TYPE_EMOJI`).
 */
export function StopPill({ stopType }: Props) {
  const label = STOP_TYPE_LABELS[stopType];
  const colors = StopTypeColorsByType[stopType];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Tipo de parada: ${label}`}
      style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* `Text` pelado y no `ThemedText`: pintar un emoji con `color` lo
          aplana a una silueta monocroma en Android. */}
      <Text style={styles.emoji}>{STOP_TYPE_EMOJI[stopType]}</Text>
      <ThemedText type="small" style={{ color: colors.text }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 2,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  emoji: {
    fontSize: 13,
  },
});
