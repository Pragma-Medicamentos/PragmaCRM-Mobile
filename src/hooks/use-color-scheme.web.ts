import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme, type ColorSchemeName } from 'react-native';

const noopSubscribe = () => () => {};
const getServerSnapshot = (): ColorSchemeName => 'light';

/**
 * En web el arbol se prerenderiza en Node (`app.json: web.output = "static"`),
 * donde no existe el esquema de color del sistema. useSyncExternalStore
 * devuelve el snapshot del servidor durante la hidratacion y el real despues,
 * sin el efecto + setState que provocaria un render en cascada.
 */
export function useColorScheme(): ColorSchemeName {
  const colorScheme = useRNColorScheme();
  return useSyncExternalStore(noopSubscribe, () => colorScheme, getServerSnapshot);
}
