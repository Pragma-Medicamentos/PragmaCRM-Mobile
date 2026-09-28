import type { StopType } from './daily-route';

/**
 * Etiqueta en español de cada tipo de parada.
 *
 * `StopType` llega del backend en inglés (CLAUDE.md 5.2 de la API) y la
 * interfaz es toda en español, asi que la traduccion tiene que existir en
 * algun lado. Vive aca, suelta y sin imports de React Native, y no dentro del
 * componente de la pildora, porque el color se resuelve con la misma clave:
 * `StopTypeColorsByType` en `theme.ts` indexa por `StopType` justamente para
 * que nadie tenga que repetir el mapa ingles -> español.
 */
export const STOP_TYPE_LABELS: Record<StopType, string> = {
  visit: 'Visita',
  dispatch: 'Despacho',
  collection: 'Cobro',
};

/**
 * Emoji de cada tipo de parada, para el chip que acompaña al pin seleccionado
 * en el mapa.
 *
 * Son emoji y no iconos vectoriales porque los pinta la fuente del sistema:
 * cero assets que generar, cero densidades que mantener. La contrapartida es
 * que el dibujo exacto lo decide la plataforma, asi que el emoji nunca puede
 * ser el unico portador del dato -- de ahi que el chip lleve siempre
 * `accessibilityLabel` con el texto de `STOP_TYPE_LABELS`.
 */
export const STOP_TYPE_EMOJI: Record<StopType, string> = {
  visit: '🏪',
  dispatch: '🚚',
  collection: '💵',
};
