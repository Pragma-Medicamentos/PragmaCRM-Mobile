import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopGradient } from '@/components/top-gradient';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

const MIN_LENGTH = 8;

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
  const confirmationRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;

    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setError(undefined);

    const message = await completePasswordSetup(password);

    // Si funciono, el guard reabre los tabs y desmonta esta pantalla; solo hay
    // que devolver el formulario a su estado normal cuando fallo.
    if (message) {
      setError(message);
      setSubmitting(false);
    }
  }

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

            <TextField
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder={`Mínimo ${MIN_LENGTH} caracteres`}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              editable={!submitting}
              onSubmitEditing={() => confirmationRef.current?.focus()}
            />

            <TextField
              ref={confirmationRef}
              label="Confirmar contraseña"
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Repite la contraseña"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              editable={!submitting}
              onSubmitEditing={() => void handleSubmit()}
            />

            {error ? (
              <ThemedText type="small" themeColor="danger" style={styles.centered}>
                {error}
              </ThemedText>
            ) : null}

            <Button
              title="Guardar contraseña"
              onPress={() => void handleSubmit()}
              loading={submitting}
              disabled={submitting}
            />

            <Button
              title="Cerrar sesión"
              variant="secondary"
              onPress={() => void signOut()}
              disabled={submitting}
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
