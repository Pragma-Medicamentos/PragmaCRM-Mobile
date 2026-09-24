import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { ExtraBadgeBorderColor, Spacing } from '@/constants/theme';

/**
 * Badge "Extra": parada agregada fuera de la planificacion de la ruta (ver el
 * comentario de `ExtraBadgeBorderColor` en `theme.ts`). Es el unico badge que
 * existe hoy -- "Prioritaria" y "Por Rosa A." quedan para otros tickets,
 * porque todavia no hay datos que los respalden.
 */
export function StopBadge() {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Parada extra, agregada fuera de la planificación"
      style={styles.badge}>
      <ThemedText type="small" themeColor="textSecondary">
        Extra
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: ExtraBadgeBorderColor,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
