import { StyleSheet, Text, View } from 'react-native';

import { StopTypeColorsByType, Spacing } from '@/constants/theme';
import type { StopType } from '@/lib/daily-route';
import { STOP_TYPE_EMOJI, STOP_TYPE_LABELS } from '@/lib/stop-type';

type Props = {
  stopType: StopType;
};

/**
 * Chip redondo con el emoji del tipo de parada, para el pin seleccionado en
 * el mapa: tienda (Visita), camion (Despacho), dinero (Cobro).
 *
 * En el mapa el tipo se lee por el color del pin, y eso obliga al vendedor a
 * recordar que significa cada color. El emoji lo dice sin memoria de por
 * medio. El aro repite igual el color del tipo, asi que el chip y el pin que
 * esta acompañando se leen como la misma cosa.
 *
 * El emoji va en un `Text` pelado y no en `ThemedText`: `ThemedText` aplica
 * color, y pintar un emoji lo aplana a una silueta monocroma en Android.
 */
export function StopTypeIcon({ stopType }: Props) {
  const colors = StopTypeColorsByType[stopType];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Tipo de parada: ${STOP_TYPE_LABELS[stopType]}`}
      style={[styles.chip, { borderColor: colors.border }]}>
      {/* `allowFontScaling={false}`: el chip es un circulo de tamaño fijo, y
          con la fuente del sistema al maximo el emoji se sale del aro. El
          dato no se pierde -- lo lleva el `accessibilityLabel` de arriba. */}
      <Text allowFontScaling={false} style={styles.emoji}>
        {STOP_TYPE_EMOJI[stopType]}
      </Text>
    </View>
  );
}

const CHIP_SIZE = 36;

const styles = StyleSheet.create({
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    borderWidth: 2,
    // Blanco y no transparente: el emoji sobre las calles del mapa se
    // vuelve ilegible, y el circulo blanco le da el respaldo que necesita.
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.half,
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
  },
});
