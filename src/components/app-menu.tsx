import { useRouter } from 'expo-router';
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
  const router = useRouter();

  const items: MenuItem[] = [
    { key: 'ruta', icon: '🗺️', label: 'Ruta de hoy', onPress: onClose },
    {
      key: 'calendario',
      icon: '📅',
      label: 'Calendario de rutas',
      // PCRM-170. Se cierra el menu antes de empujar: el Modal queda por
      // encima de cualquier pantalla del Stack mientras siga visible.
      onPress: () => {
        onClose();
        router.push('/calendar');
      },
    },
    {
      key: 'historial',
      icon: '🕘',
      label: 'Historial de rutas',
      onPress: () => {},
      disabled: true,
    },
    {
      key: 'perfil',
      icon: '👤',
      label: 'Mi perfil',
      onPress: () => {
        onClose();
        router.push('/profile');
      },
    },
    // PCRM-204: sin "Ajustes" (wireframe 13), por decision del PO. Permisos se
    // gestionan desde el sistema operativo, solo hay tema claro, no hay push,
    // y cambiar la contraseña vive en Mi perfil.
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
            "Cerrar sesión" no esta en el wireframe 9 -- ahi vivia en Ajustes,
            que se descarto (PCRM-204). Se queda en este menu de forma
            definitiva: es el unico `signOut()` de la app fuera de
            `set-password`.
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
