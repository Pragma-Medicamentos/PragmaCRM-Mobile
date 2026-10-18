import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayTiming } from '@/lib/weekly-route-format';

const LABELS: Record<DayTiming, string> = {
  today: 'Hoy',
  upcoming: 'Próxima',
  past: 'Pasada',
};

/** Pildora "Hoy" / "Próxima" / "Pasada" del calendario de rutas. */
export function DayBadge({ timing }: { timing: DayTiming }) {
  const theme = useTheme();
  const color = timing === 'today' ? theme.tint : theme.textSecondary;

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: timing === 'today' ? theme.tintBright : theme.backgroundSelected,
          backgroundColor: timing === 'today' ? withAlpha(theme.tintBright, 0.12) : theme.background,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color }}>
        {LABELS[timing]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.half,
  },
});
