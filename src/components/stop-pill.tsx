import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing, StopTypeColorsByType } from '@/constants/theme';
import type { StopType } from '@/lib/daily-route';
import { STOP_TYPE_LABELS } from '@/lib/stop-type';

type Props = {
  stopType: StopType;
};

/** Pildora de tipo de parada (Visita / Despacho / Cobro) de la tarjeta de ruta. */
export function StopPill({ stopType }: Props) {
  const label = STOP_TYPE_LABELS[stopType];
  const colors = StopTypeColorsByType[stopType];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Tipo de parada: ${label}`}
      style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
    borderWidth: 2,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
