import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NewPasswordForm } from '@/components/new-password-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopGradient } from '@/components/top-gradient';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Establecimiento de la contraseña definitiva, despues de entrar por codigo.
 *
 * Cubre los dos casos con el mismo comportamiento: el primer ingreso, donde la
 * cuenta se creo sin contraseña, y la recuperacion de una olvidada. En ambos la
 * unica salida es completar o cerrar sesion, asi que no hay variante opcional.
 *
 * El layout de `(protected)` decide cuando es alcanzable; aqui no se repite esa
 * comprobacion.
 */
export default function SetPasswordScreen() {
  const completePasswordSetup = useAuthStore((state) => state.completePasswordSetup);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <ThemedView style={styles.container}>
      <TopGradient />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.centered}>
                Crea tu contraseña
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                Elige la contraseña con la que entrarás de ahora en adelante.
              </ThemedText>
            </View>

            <NewPasswordForm
              submitLabel="Guardar contraseña"
              // Si funciono, el guard reabre los tabs y desmonta esta pantalla.
              onSubmit={completePasswordSetup}
              renderSecondaryAction={(submitting) => (
                <Button
                  title="Cerrar sesión"
                  variant="secondary"
                  onPress={() => void signOut()}
                  disabled={submitting}
                />
              )}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
});
