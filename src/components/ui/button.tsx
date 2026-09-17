import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  // Un boton que ya esta trabajando no debe aceptar un segundo toque.
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      <View
        style={[
          styles.button,
          { backgroundColor: isPrimary ? theme.tint : theme.backgroundSelected },
        ]}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? theme.tintText : theme.text} />
        ) : (
          <ThemedText
            type="smallBold"
            style={isPrimary ? { color: theme.tintText } : undefined}>
            {title}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
