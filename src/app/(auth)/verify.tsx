import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
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
 * La longitud del codigo la fija el proyecto de Supabase (`otp_length`), no la
 * app: este proyecto emite 8 digitos aunque el `config.toml` local diga 6, y
 * cambiarlo en el dashboard no deberia obligar a publicar una version nueva.
 * Se acepta un rango y se deja que Supabase sea quien valide el codigo.
 */
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 10;

/** Supabase solo permite pedir un codigo cada 60 segundos. */
const RESEND_SECONDS = 60;

/**
 * Segundo paso del ingreso por codigo. Verificarlo abre una sesion real, asi
 * que al terminar el guard raiz desmonta todo `(auth)` y la compuerta de
 * `(protected)` lleva a establecer la contraseña.
 */
export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  // Llegar aqui sin correo solo pasa por un enlace directo; no hay nada que
  // verificar sin el. El formulario vive aparte para recibirlo ya garantizado.
  if (!email) return <Redirect href="/otp" />;

  return <VerifyOtpForm email={email} />;
}

function VerifyOtpForm({ email }: { email: string }) {
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const requestOtp = useAuthStore((state) => state.requestOtp);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // Cuenta regresiva del reenvio. Sin ella el usuario toca el boton y recibe un
  // error de limite de tasa sin entender por que.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const canSubmit = code.trim().length >= MIN_CODE_LENGTH && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(undefined);

    const message = await verifyOtp(email, code);

    // Si funciono, esta pantalla se desmonta con el resto de `(auth)`.
    if (message) {
      setError(message);
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || resending) return;

    setResending(true);
    setError(undefined);

    const message = await requestOtp(email);
    setResending(false);

    if (message) {
      setError(message);
      return;
    }

    setCode('');
    setSecondsLeft(RESEND_SECONDS);
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
                Revisa tu correo
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                Si {email} está registrado, te llegó un código numérico. Escríbelo aquí.
              </ThemedText>
            </View>

            <TextField
              label="Código"
              value={code}
              onChangeText={setCode}
              placeholder="Código"
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={MAX_CODE_LENGTH}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="done"
              editable={!submitting}
              style={styles.code}
              onSubmitEditing={() => void handleSubmit()}
            />

            {error ? (
              <ThemedText type="small" themeColor="danger" style={styles.centered}>
                {error}
              </ThemedText>
            ) : null}

            <Button
              title="Verificar"
              onPress={() => void handleSubmit()}
              loading={submitting}
              disabled={!canSubmit}
            />

            <Button
              title={secondsLeft > 0 ? `Reenviar código (${secondsLeft}s)` : 'Reenviar código'}
              variant="secondary"
              onPress={() => void handleResend()}
              loading={resending}
              disabled={secondsLeft > 0 || submitting}
            />

            <Button
              title="Usar otro correo"
              variant="secondary"
              onPress={() => router.back()}
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
  code: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 6,
  },
});
