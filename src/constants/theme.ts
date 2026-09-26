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

/**
 * Colores de los pills de tipo de parada en la tarjeta de ruta diaria.
 *
 * Viven fuera de `brand`/`Colors` a proposito: `Colors` es la paleta de marca
 * (ver el comentario de `brand` arriba) y `ThemeColor` es
 * `keyof typeof Colors.light`, que es lo que acepta el prop `themeColor` de
 * `ThemedText`. Meter estos colores dentro de `Colors` los habilitaria para
 * ese prop -- exactamente lo que no queremos, porque son colores de estado de
 * un dominio (tipo de parada), no colores de marca. Se aplican inline con
 * `style={{ color: ... }}`.
 *
 * Visita usa el verde de marca (`tint` para texto, `tintBright` para el
 * borde) en vez del `#00AC00` del wireframe: asi el pill respeta la
 * identidad de Farmacia Pragma en vez de copiar un verde generico.
 *
 * El fondo de cada pill sale de `withAlpha()`, nunca de un `rgba()` a mano:
 * Android interpola feo hacia `transparent` si el string no viene de ahi.
 */
export const StopTypeColors = {
  visita: {
    text: brand.tint,
    border: brand.tintBright,
    background: withAlpha(brand.tintBright, 0.12),
  },
  despacho: {
    text: '#1C4F9C',
    border: '#2A6FDB',
    background: withAlpha('#2A6FDB', 0.12),
  },
  cobro: {
    text: '#8A5800',
    border: '#D98C00',
    background: withAlpha('#D98C00', 0.12),
  },
} as const;

/**
 * El badge "Extra" (parada agregada fuera de la planificacion) no es un tipo
 * de parada mas, asi que no suma una cuarta entrada a `StopTypeColors`: solo
 * necesita el borde punteado sobre `textSecondary`. Se expone aca para que
 * el componente de la tarjeta importe un unico modulo de tokens para los
 * cuatro pills en vez de mezclar `theme.textSecondary` y `StopTypeColors`.
 * El trazo punteado en si (`borderStyle: 'dashed'`) es un detalle de layout,
 * no de color, y va en la hoja de estilos del componente.
 */
export const ExtraBadgeBorderColor = brand.textSecondary;

/**
 * Violeta del pin de prospecto (PCRM-49).
 *
 * Va suelto y no dentro de `StopTypeColors` a proposito: ese objeto esta
 * indexado por tipo de parada, y un prospecto no es un tipo de parada sino un
 * destino que todavia no es cliente. Meterlo ahi romperia esa invariante y el
 * tipado de `StopType`.
 *
 * Queda fuera de la escala verde/azul/ambar para que se lea como otra
 * categoria, no como un cuarto tipo. El gris seria mas literal para "todavia
 * no es cliente", pero desaparece contra las calles del mapa.
 *
 * El pin no consume esta constante -- el color va horneado en el PNG, porque
 * `GoogleMapsMarker` no tiene prop de tinte (ver scripts/generate-map-pins.py).
 * Existe para que el dia que haya una leyenda o un badge de prospecto usen
 * este valor en vez de repetir el hex.
 */
export const ProspectPinColor = '#6B3FA0';
