import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Button } from './ui/button';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type MenuItem = {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Menu de pantalla completa del wireframe 9 -- a diferencia de la version
 * anterior (una hoja anclada abajo), esta es pantalla completa: encabezado
 * con "✕" + "Menú" y debajo la lista con divisores de 1px. Se monta desde
 * `(protected)/index.tsx`, que ya tenia demasiadas lineas para seguir
 * cargando con el `Modal` adentro.
 */
export function AppMenu({ visible, onClose }: Props) {
  const theme = useTheme();
  const signOut = useAuthStore((state) => state.signOut);

  const items: MenuItem[] = [
    { key: 'ruta', icon: '🗺️', label: 'Ruta de hoy', onPress: onClose },
    {
      key: 'calendario',
      icon: '📅',
      label: 'Calendario de rutas',
      onPress: () => {},
      disabled: true,
    },
    {
      key: 'historial',
      icon: '🕘',
      label: 'Historial de rutas',
      onPress: () => {},
      disabled: true,
    },
    { key: 'perfil', icon: '👤', label: 'Mi perfil', onPress: () => {}, disabled: true },
    { key: 'ajustes', icon: '⚙️', label: 'Ajustes', onPress: () => {}, disabled: true },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar menú"
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
              <ThemedText type="heading">✕</ThemedText>
            </Pressable>
            <ThemedText type="heading">Menú</ThemedText>
            {/* Placeholder del mismo ancho que el botón de cerrar, para que el título quede centrado. */}
            <View style={styles.headerButton} />
          </View>

          <View>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                disabled={item.disabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: item.disabled ?? false }}
                accessibilityLabel={
                  item.disabled ? `${item.label}, próximamente` : item.label
                }
                style={({ pressed }) => [
                  styles.item,
                  { borderBottomColor: theme.backgroundSelected },
                  item.disabled && styles.itemDisabled,
                  pressed && !item.disabled && styles.pressed,
                ]}>
                <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
                <ThemedText style={styles.itemLabel}>{item.label}</ThemedText>
                {item.disabled && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Próximamente
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>

          {/*
            "Cerrar sesión" no esta en el wireframe 9 -- ahi vive en Ajustes
            (pantalla 11), que todavia no existe. Se queda en este menu como
            desviacion deliberada: hoy es el unico `signOut()` de la app, asi
            que sacarlo sin esa pantalla lista dejaria un build sin salida.
            Mover a Ajustes cuando esa pantalla se construya.
          */}
          <View style={styles.signOut}>
            <Button
              title="Cerrar sesión"
              variant="secondary"
              onPress={() => {
                onClose();
                void signOut();
              }}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemLabel: {
    flex: 1,
  },
  signOut: {
    marginTop: 'auto',
    padding: Spacing.three,
  },
});
