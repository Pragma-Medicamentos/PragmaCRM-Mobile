/**
 * Tokens de tema de la aplicacion: color, tipografia y espaciado.
 */

import '@/global.css';

import { Platform } from 'react-native';

import type { PersonalityKey } from '@/lib/customer-profile';
import type { StopType } from '@/lib/daily-route';

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
 * El mismo objeto de arriba, indexado por `StopType` (ingles, como llega del
 * backend) en vez de por el texto del pill.
 *
 * Existe para que ningun componente tenga que repetir el mapa
 * ingles -> español para llegar al color: antes lo hacia `stop-pill.tsx` por
 * su cuenta, y al aparecer el segundo consumidor (el chip de tipo del mapa)
 * esa traduccion habria quedado duplicada.
 */
export const StopTypeColorsByType: Record<StopType, (typeof StopTypeColors)[keyof typeof StopTypeColors]> = {
  visit: StopTypeColors.visita,
  dispatch: StopTypeColors.despacho,
  collection: StopTypeColors.cobro,
};

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
 * Colores del prospecto (PCRM-49): el pin del mapa y la pildora "Prospecto"
 * que lo nombra, tanto en el mapa como en la tarjeta de la lista.
 *
 * Van sueltos y no dentro de `StopTypeColors` a proposito: ese objeto esta
 * indexado por tipo de parada, y un prospecto no es un tipo de parada sino un
 * destino que todavia no es cliente. Meterlo ahi romperia esa invariante y el
 * tipado de `StopType`.
 *
 * `fill` queda fuera de la escala verde/azul/ambar para que se lea como otra
 * categoria, no como un cuarto tipo -- pero es vecino del ambar de Cobro en
 * tono, asi que el color solo no alcanza para separarlos. Lo que termina de
 * hacerlo es el contorno punteado, que ambos (pin y pildora) comparten.
 *
 * `text` es el negro del tema y no `tintText`: el blanco sobre este amarillo
 * da 1.6:1 y es ilegible.
 *
 * El pin del mapa no consume estas constantes -- ese color va horneado en el
 * PNG, porque `GoogleMapsMarker` no tiene prop de tinte (ver
 * scripts/generate-map-pins.py). Tienen que coincidir con
 * `PIN_TYPES['pin-prospecto']` de ese script: si alguien cambia uno sin el
 * otro, la pildora deja de corresponderse con el pin que esta nombrando.
 */
export const ProspectColors = {
  fill: '#FFC400',
  border: '#A67A00',
  text: brand.text,
} as const;

/**
 * Colores de la personalidad del cliente (RF-12): el punto y el texto del chip
 * de la tarjeta y del detalle.
 *
 * Fuera de `Colors` por la misma razon que `StopTypeColors`: son colores de un
 * dato del dominio, no de marca, y no deben aparecer en `themeColor`.
 *
 * El `dot` es el color que nombra la personalidad y tiene que leerse como tal
 * ("rojo" tiene que verse rojo), asi que no se reusa el verde de marca ni el
 * azul de Despacho: un verde de personalidad identico al de la pildora de
 * Visita haria pensar que el chip habla del tipo de parada. `text` es la
 * variante oscura de cada uno, porque el amarillo como texto sobre blanco no
 * pasa contraste.
 */
export const PersonalityColors: Record<
  PersonalityKey,
  { dot: string; text: string; background: string }
> = {
  rojo: { dot: '#D93025', text: '#A1201A', background: withAlpha('#D93025', 0.12) },
  amarillo: { dot: '#F2C200', text: '#7A5E00', background: withAlpha('#F2C200', 0.16) },
  verde: { dot: '#2E9E4F', text: '#1E6B35', background: withAlpha('#2E9E4F', 0.12) },
  azul: { dot: '#1A73E8', text: '#1356AD', background: withAlpha('#1A73E8', 0.12) },
};
