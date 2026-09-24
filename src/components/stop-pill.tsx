import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing, StopTypeColors } from '@/constants/theme';
import type { StopType } from '@/lib/daily-route';

type Props = {
  stopType: StopType;
};

/**
 * Une la etiqueta en español y los colores de `StopTypeColors` en un solo
 * lugar: `StopType` llega del backend en inglés (CLAUDE.md 5.2 de la API),
 * pero las claves de `StopTypeColors` estan en español porque copian el
 * texto del pill. Sin este mapa habria que repetir la traduccion donde sea
 * que se necesite el color.
 */
const STOP_TYPE_CONFIG: Record<
  StopType,
  { label: string; colors: (typeof StopTypeColors)[keyof typeof StopTypeColors] }
> = {
  visit: { label: 'Visita', colors: StopTypeColors.visita },
  dispatch: { label: 'Despacho', colors: StopTypeColors.despacho },
  collection: { label: 'Cobro', colors: StopTypeColors.cobro },
};

/** Pildora de tipo de parada (Visita / Despacho / Cobro) de la tarjeta de ruta. */
export function StopPill({ stopType }: Props) {
  const { label, colors } = STOP_TYPE_CONFIG[stopType];

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
