import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '../themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  /** Debe coincidir con `otp_length` del proyecto de Supabase. */
  length: number;
  editable?: boolean;
  /**
   * Se dispara al llenar el ultimo recuadro.
   *
   * Recibe el codigo como argumento a proposito: `onChangeText` acaba de
   * agendar una actualizacion de estado que todavia no se aplico, asi que quien
   * escuche esto leeria el valor anterior si lo tomara del estado.
   */
  onComplete?: (value: string) => void;
};

/**
 * Casillas de un digito para el codigo de acceso.
 *
 * Por dentro es UN solo TextInput transparente encima de los recuadros, no un
 * input por casilla. Es lo que mantiene funcionando el autorrelleno del codigo
 * que ofrecen iOS y Android, y evita toda la fontaneria de mover el foco entre
 * campos — donde el borrado es especialmente propenso a fallar, porque un input
 * vacio no emite el evento que haria retroceder al anterior.
 *
 * Los recuadros son puro dibujo: el estado vive en una sola cadena.
 */
export function OtpInput({ value, onChangeText, length, editable = true, onComplete }: Props) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  // El cursor se dibuja sobre la primera casilla vacia, salvo cuando el codigo
  // ya esta completo: ahi se queda en la ultima en vez de desbordar el arreglo.
  const caretIndex = Math.min(value.length, length - 1);

  function handleChange(next: string) {
    // El teclado numerico de Android deja escribir coma, punto y hasta signos;
    // filtrar aqui evita que un caracter invisible llene una casilla.
    const digits = next.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);

    if (digits.length === length) onComplete?.(digits);
  }

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      disabled={!editable}
      accessibilityRole="none"
      style={styles.container}>
      <View style={styles.row}>
        {Array.from({ length }, (_, index) => {
          const digit = value[index];
          const isCaret = focused && index === caretIndex;

          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: isCaret ? theme.tint : theme.backgroundSelected,
                },
              ]}>
              <ThemedText style={styles.digit}>{digit ?? ''}</ThemedText>
            </View>
          );
        })}
      </View>

      {/*
        Invisible pero no `display:none`: tiene que seguir en el arbol y del
        tamaño de los recuadros para recibir el toque, anclar el menu de
        autorrelleno y que el teclado no lo tape.
      */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
        caretHidden
        selectionColor="transparent"
        accessibilityLabel="Código de acceso"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  box: {
    // `flex: 1` reparte el ancho disponible y `aspectRatio` deriva el alto, de
    // modo que ocho casillas entran igual en un telefono angosto que en tablet.
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    minWidth: 0,
    borderRadius: Spacing.two,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    // Android ignora el toque sobre un input de alto cero aunque sea absoluto.
    height: '100%',
    color: 'transparent',
  },
});
