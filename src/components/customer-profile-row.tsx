import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { PersonalityColors, Spacing } from '@/constants/theme';
import {
  PERSONALITY_LABELS,
  POTENTIAL_LABELS,
  personalityKey,
  potentialKey,
} from '@/lib/customer-profile';
import type { DailyRouteStop } from '@/lib/daily-route';

type Props = {
  stop: Pick<DailyRouteStop, 'personality' | 'potential'>;
};

/**
 * Personalidad y potencial del cliente (RF-12), en una fila.
 *
 * Es el mismo componente en la tarjeta y en el detalle para que no puedan
 * decir cosas distintas del mismo cliente. Sin ninguno de los dos datos no
 * dibuja nada -- una fila vacia empujaria el resto de la tarjeta para no
 * decir nada.
 */
export function CustomerProfileRow({ stop }: Props) {
  const personality = personalityKey(stop.personality);
  const potential = potentialKey(stop.potential);

  if (!personality && !potential) return null;

  return (
    <View style={styles.row}>
      {personality && <PersonalityChip personality={personality} />}
      {potential && (
        <ThemedText type="small" themeColor="textSecondary">
          Potencial: <ThemedText type="smallBold">{POTENTIAL_LABELS[potential]}</ThemedText>
        </ThemedText>
      )}
    </View>
  );
}

/**
 * Chip de personalidad: punto del color y su nombre. El nombre va escrito
 * ademas del punto porque el color solo no lo distingue quien no ve bien los
 * colores -- rojo y verde son justamente el par que mas se confunde.
 */
function PersonalityChip({ personality }: { personality: keyof typeof PersonalityColors }) {
  const colors = PersonalityColors[personality];
  const label = PERSONALITY_LABELS[personality];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Personalidad: ${label}`}
      style={[styles.chip, { backgroundColor: colors.background }]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <ThemedText type="small" style={{ color: colors.text }}>
        {label}
      </ThemedText>
    </View>
  );
}

const DOT_SIZE = 10;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
