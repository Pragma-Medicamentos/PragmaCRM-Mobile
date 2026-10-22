import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Mi perfil (wireframe 12, PCRM-204): los datos del vendedor en sesion, solo
 * lectura. Los administra el panel web (RF-01); telefono, foto y zona del
 * wireframe no existen en `app_user` y quedan fuera.
 *
 * Lee el perfil que ya cargo el layout de `(protected)` con `GET /api/v1/me`:
 * esta pantalla solo es alcanzable con el perfil listo, asi que no pide nada.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);

  // El layout no monta el Stack sin perfil listo; esto solo cubre el instante
  // en que se cierra sesion con la pantalla abierta.
  if (profile.status !== 'ready') return <ThemedView style={styles.container} />;

  const { name, email, role } = profile.me;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Mi perfil" />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="subtitle">{initials(name)}</ThemedText>
            </View>
            <ThemedText type="heading" style={styles.centered}>
              {name}
            </ThemedText>
          </View>

          <View style={[styles.card, { borderColor: theme.backgroundSelected }]}>
            <Field label="Nombre" value={name} />
            <Field label="Correo" value={email ?? 'Sin correo'} />
            <Field label="Rol" value={role} last />
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Tus datos los administra el panel web. Si algo no es correcto, avisa al administrador.
          </ThemedText>

          <Button
            title="Cambiar contraseña"
            variant="secondary"
            onPress={() => router.push('/change-password')}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.field,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected },
      ]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText selectable>{value}</ThemedText>
    </View>
  );
}

/** "Ana María López" → "AL": primera y ultima palabra, como el avatar del wireframe. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  field: {
    gap: Spacing.half,
    paddingVertical: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
});
