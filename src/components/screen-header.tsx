import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Algo a la derecha del titulo, p. ej. el badge "Hoy". */
  accessory?: ReactNode;
};

/**
 * Encabezado "← Titulo" de las pantallas empujadas desde el menu
 * (wireframes 13 a 16). Es propio y no el header del Stack porque el layout de
 * `(protected)` monta todo con `headerShown: false` y el wireframe pide el
 * mismo borde inferior que el menu.
 */
export function ScreenHeader({ title, subtitle, accessory }: Props) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.header, { borderBottomColor: theme.text }]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <ThemedText type="heading">←</ThemedText>
      </Pressable>

      <View style={styles.titles}>
        <ThemedText type="heading" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  titles: {
    flex: 1,
  },
});
