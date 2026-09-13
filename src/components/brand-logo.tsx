import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

/**
 * Relacion de aspecto del archivo, recortado a su contenido: 942x342. Se fija
 * aqui para que el alto se derive del ancho y el logo nunca se deforme, sin
 * que cada pantalla tenga que repetir las dos medidas.
 */
const ASPECT_RATIO = 942 / 342;

const DEFAULT_WIDTH = 220;

type Props = {
  /** Ancho en puntos; el alto se calcula a partir de la relacion de aspecto. */
  width?: number;
};

export function BrandLogo({ width = DEFAULT_WIDTH }: Props) {
  return (
    <Image
      source={require('@/assets/images/brand-wordmark.png')}
      style={[styles.image, { width, height: width / ASPECT_RATIO }]}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Farmacia Pragma"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});
