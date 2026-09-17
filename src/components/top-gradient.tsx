import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Alto del velo como fraccion de la pantalla. */
const DEFAULT_HEIGHT = '45%';

type Props = {
  /** Alto del degradado; acepta puntos o porcentaje del contenedor. */
  height?: number | `${number}%`;
  /** Opacidad de la parada superior; el resto del ramp escala con ella. */
  intensity?: number;
};

/**
 * Velo de marca que tine la parte superior de la pantalla y se desvanece hacia
 * abajo. Se apoya en tintBright porque la paleta lo reserva para acentos
 * graficos; el verde de texto (tint) es mas apagado y aqui se veria sucio.
 *
 * Las tres paradas no son decorativas: un ramp lineal de alfa se percibe como
 * un corte a media altura, asi que la parada intermedia baja antes de lo que
 * le tocaria y alarga la cola hasta volverse invisible.
 *
 * Va montado en absoluto y sin captura de toques para que no altere el layout
 * ni se interponga entre el usuario y el formulario.
 *
 * Cada pantalla lo monta como primer hijo del contenedor raiz y por fuera del
 * SafeAreaView: primero, para que el formulario quede por encima; segundo, para
 * que el verde alcance la barra de estado en vez de cortarse en el notch. El
 * header de esas pantallas es un View y no un ThemedView por lo mismo -- un
 * fondo blanco opaco taparia el velo justo donde mas se ve.
 */
export function TopGradient({ height = DEFAULT_HEIGHT, intensity = 0.26 }: Props) {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={[
        withAlpha(theme.tintBright, intensity),
        withAlpha(theme.tintBright, intensity * 0.35),
        withAlpha(theme.tintBright, 0),
      ]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.gradient, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  gradient: {
    // En estilo y no como prop: RN 0.86 marca props.pointerEvents como
    // obsoleto y avisa en consola cada montaje.
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
