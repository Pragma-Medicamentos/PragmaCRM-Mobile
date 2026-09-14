import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopGradient } from '@/components/top-gradient';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Via principal de ingreso, y ancla del grupo `(auth)`.
 *
 * `intent=reset` distingue "olvide mi contraseña" de un ingreso normal. Sin ese
 * dato el codigo no puede saber a que viniste, y forzar contraseña en los dos
 * casos obliga a cambiarla a quien solo queria entrar.
 */
export default function RequestOtpScreen() {
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const isReset = intent === 'reset';

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
    router.push({
      pathname: '/verify',
      params: { email: email.trim(), ...(isReset ? { intent: 'reset' } : {}) },
    });
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
              <BrandLogo width={160} />
              <ThemedText type="subtitle" style={styles.centered}>
                {isReset ? 'Recupera tu acceso' : 'Ingresa con un código'}
              </ThemedText>
              {/*
                Sin decir cuantos digitos: la longitud la fija `otp_length` en
                el proyecto de Supabase, no la app, y hoy no coincide con los 6
                que asumia este texto.
              */}
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                {isReset
                  ? 'Te enviaremos un código para que crees una contraseña nueva.'
                  : 'Te enviaremos un código al correo que registró tu administrador.'}
              </ThemedText>
            </View>

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

            {/*
              Esta pantalla es el ancla del grupo, asi que no hay historial al
              que volver: el camino alterno es un enlace, no un boton de atras.
            */}
            <Link href="/sign-in" asChild>
              <Pressable
                accessibilityRole="link"
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="tint" style={styles.centered}>
                  Ingresar con contraseña
                </ThemedText>
              </Pressable>
            </Link>
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
  link: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
