import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
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
  const isOutline = variant === 'outline';
  // Un boton que ya esta trabajando no debe aceptar un segundo toque.
  const isDisabled = disabled || loading;

  // El outline (boton "Abrir ruta en maps" sobre el mapa) necesita
  // contraste propio incluso sobre un fondo variable como el del mapa: fondo
  // solido de la app + borde del color de marca, en vez de transparente.
  const backgroundColor = isPrimary
    ? theme.tint
    : isOutline
      ? theme.background
      : theme.backgroundSelected;
  const textColor = isPrimary ? theme.tintText : isOutline ? theme.tint : theme.text;

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
          { backgroundColor },
          isOutline && [styles.outline, { borderColor: theme.tint }],
        ]}>
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <ThemedText type="smallBold" style={{ color: textColor }}>
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
  outline: {
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
