import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';

/**
 * `expo-maps` no tiene implementacion web, y este repo toma web en serio
 * (`app.json: web.output: "static"`, con variantes `.web.tsx` dedicadas
 * donde algo no puede compartirse -- ver `app-tabs.web.tsx`,
 * `animated-icon.web.tsx`).
 *
 * Ruling R2 del controlador: este fallback muestra SOLO el aviso, no una
 * copia de la lista de paradas. La lista ya es alcanzable en web desde el
 * boton "Ver paradas" de `(tabs)/index.tsx`; duplicarla aca dejaria dos
 * listas que pueden divergir entre si.
 */
export function RouteMap() {
  return (
    <View style={styles.container}>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Mapa no disponible en web
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
