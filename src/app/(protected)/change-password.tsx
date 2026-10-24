import { useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NewPasswordForm } from '@/components/new-password-form';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Cambio de contraseña desde Mi perfil (PCRM-204). Mismo formulario que
 * `set-password`, pero opcional: tiene "←" para volver sin cambiar nada.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const changePassword = useAuthStore((state) => state.changePassword);

  async function handleSubmit(password: string) {
    const message = await changePassword(password);
    if (message) return message;

    Alert.alert(
      'Contraseña actualizada',
      'La próxima vez que inicies sesión, usa tu nueva contraseña.',
      [{ text: 'Aceptar', onPress: () => router.back() }],
      // En Android tocar fuera cierra el aviso sin pasar por el boton.
      { cancelable: true, onDismiss: () => router.back() },
    );
    return undefined;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Cambiar contraseña" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <ThemedText themeColor="textSecondary">
              Escribe tu nueva contraseña dos veces. Seguirás con la sesión abierta.
            </ThemedText>

            <NewPasswordForm submitLabel="Guardar contraseña" onSubmit={handleSubmit} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
