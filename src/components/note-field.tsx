import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { NOTE_MAX_LENGTH, NOTE_SHORTCUTS } from '@/lib/note';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

/**
 * Atajos + campo de la nota de visita (RF-07). Lo comparten la hoja de
 * confirmacion y la de editar nota, para que las dos escriban la misma nota
 * de la misma forma.
 *
 * Solo sirve dentro de una hoja de gorhom: usa `BottomSheetTextInput`.
 */
export function NoteField({ label, value, onChangeText }: Props) {
  const theme = useTheme();

  return (
    <>
      <View style={styles.shortcuts}>
        {NOTE_SHORTCUTS.map((shortcut) => {
          const selected = value.trim() === shortcut;

          return (
            <Pressable
              key={shortcut}
              onPress={() => onChangeText(selected ? '' : shortcut)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.shortcut,
                {
                  borderColor: selected ? theme.tint : theme.backgroundSelected,
                  backgroundColor: selected ? theme.backgroundSelected : theme.background,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">{shortcut}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* `BottomSheetTextInput` y no el `TextField` de la app: dentro de
          una hoja, un TextInput comun deja el teclado tapando el campo
          -- gorhom necesita su propio input para reacomodar la hoja. */}
      <View style={styles.field}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
        <BottomSheetTextInput
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={NOTE_MAX_LENGTH}
          placeholder="ej. cliente no se encontró, atendió el encargado"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  shortcut: {
    borderWidth: 2,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 88,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
});
