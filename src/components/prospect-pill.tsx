import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { ProspectColors, Spacing } from '@/constants/theme';

/**
 * Pildora "Prospecto": el destino de esta parada todavia no es cliente
 * (PCRM-49).
 *
 * Es un solo componente para los dos lugares donde aparece -- la tarjeta de
 * la lista y el mapa, al seleccionar el pin -- justamente para que no puedan
 * verse distintos: es la misma afirmacion sobre la misma parada.
 *
 * Va rellena y con el borde punteado, en vez de contorneada como `StopPill`,
 * porque en la tarjeta las dos conviven: un prospecto agendado como Cobro
 * muestra la pildora ambar de Cobro y esta al mismo tiempo, y los dos tonos
 * son vecinos. Lo que las separa de un vistazo no es el color sino la forma:
 * maciza contra contorneada, punteada contra continua -- el mismo punteado
 * que lleva el pin del mapa.
 */
export function ProspectPill() {
  return (
    <View accessibilityRole="text" accessibilityLabel="Prospecto, todavía no es cliente" style={styles.pill}>
      <ThemedText type="small" style={{ color: ProspectColors.text }}>
        Prospecto
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    backgroundColor: ProspectColors.fill,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ProspectColors.border,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
