/**
 * Tokens de tema de la aplicacion: color, tipografia y espaciado.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Paleta de Farmacia Pragma. Los cuatro colores de marca salen de
 * assets/Logos/palette.png; los tres grises son derivados neutros que la
 * interfaz necesita (una tarjeta blanca sobre fondo blanco no se ve) y que la
 * paleta no define.
 *
 * tint es el unico verde que puede llevar o ser texto: da 4.63:1 sobre blanco
 * y pasa WCAG AA. tintBright se queda en 2.91:1, asi que sirve como acento
 * grafico -- indicadores, rellenos -- pero nunca para texto ni sobre texto.
 */
const brand = {
  text: '#000000',
  background: '#FFFFFF',
  backgroundElement: '#F4F4F4',
  backgroundSelected: '#E6E6E6',
  textSecondary: '#5F5F5F',
  tint: '#068802',
  tintText: '#FFFFFF',
  tintBright: '#26B003',
  danger: '#C5292A',
} as const;

/**
 * La aplicacion opera solo en modo claro; app.json lo fija con
 * userInterfaceStyle. Se conserva la forma light/dark para no tocar a los
 * consumidores, pero ambas apuntan al mismo tema: si algun entorno llegara a
 * reportar el esquema oscuro, la interfaz sigue siendo la de marca.
 */
export const Colors = {
  light: brand,
  dark: brand,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Convierte un color hexadecimal de la paleta en su equivalente rgba con la
 * opacidad indicada.
 *
 * Los degradados no pueden desvanecerse hacia `transparent`: en Android eso
 * interpola hacia rgba(0,0,0,0) y ensucia el tramo final con gris. La parada
 * final tiene que ser el mismo color con alfa 0, y para eso hace falta
 * descomponer el hex.
 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
