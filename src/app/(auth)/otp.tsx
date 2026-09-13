import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Primer paso del ingreso por codigo, que cubre tanto el primer acceso (la
 * cuenta se creo sin contraseña) como la recuperacion de una olvidada.
 */
export default function RequestOtpScreen() {
  const requestOtp = useAuthStore((state) => state.requestOtp);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(undefined);

    const message = await requestOtp(email);
    setSubmitting(false);

    if (message) {
      setError(message);
      return;
    }

    // Supabase no distingue "ese correo no existe" de un envio exitoso, a
    // proposito, para no revelar que cuentas existen. Se avanza siempre.
    router.push({ pathname: '/verify', params: { email: email.trim() } });
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle" style={styles.centered}>
                Ingresa con un código
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                Te enviaremos un código de 6 dígitos al correo que registró tu administrador.
              </ThemedText>
            </ThemedView>

            <TextField
              label="Correo"
              value={email}
              onChangeText={setEmail}
              placeholder="vendedor@empresa.com"
              inputMode="email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
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
              title="Enviar código"
              onPress={() => void handleSubmit()}
              loading={submitting}
              disabled={!canSubmit}
            />

            <Button title="Volver" variant="secondary" onPress={() => router.back()} />
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
