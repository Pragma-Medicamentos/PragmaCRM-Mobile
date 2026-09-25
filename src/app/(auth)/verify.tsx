import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopGradient } from '@/components/top-gradient';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { resolveOtpLength } from '@/lib/otp-length';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Cuantas casillas se dibujan. Tiene que coincidir con `otp_length` del
 * proyecto de Supabase: hoy emite 8 digitos, aunque el `config.toml` local diga
 * 6 — ese archivo solo configura el stack local, no el proyecto hosted.
 *
 * `EXPO_PUBLIC_OTP_LENGTH` puede sobrescribirlo. Si no llega, `resolveOtpLength`
 * usa 8. No hace falta copiar la variable desde `.env.example`.
 */
const CODE_LENGTH = resolveOtpLength();

/** Supabase solo permite pedir un codigo cada 60 segundos. */
const RESEND_SECONDS = 60;

/**
 * Segundo paso del ingreso por codigo. Verificarlo abre una sesion real, asi
 * que al terminar el guard raiz desmonta todo `(auth)` y la compuerta de
 * `(protected)` lleva a establecer la contraseña.
 */
export default function VerifyOtpScreen() {
  const { email, intent } = useLocalSearchParams<{ email?: string; intent?: string }>();

  // Llegar aqui sin correo solo pasa por un enlace directo; no hay nada que
  // verificar sin el. El formulario vive aparte para recibirlo ya garantizado.
  if (!email) return <Redirect href="/otp" />;

  return <VerifyOtpForm email={email} isReset={intent === 'reset'} />;
}

function VerifyOtpForm({ email, isReset }: { email: string; isReset: boolean }) {
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

  // El autoenvio llega desde un callback de render, donde `submitting` todavia
  // vale lo de antes. Un ref si refleja el valor actual y evita que dos
  // llamadas seguidas disparen dos verificaciones del mismo codigo.
  const submittingRef = useRef(false);

  const canSubmit = code.length === CODE_LENGTH && !submitting;

  /**
   * `candidate` permite recibir el codigo recien escrito en vez de leerlo del
   * estado: cuando se llama desde `onComplete`, `setCode` acaba de agendarse y
   * `code` sigue teniendo un digito menos.
   */
  async function handleSubmit(candidate: string = code) {
    if (submittingRef.current || candidate.length !== CODE_LENGTH) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(undefined);

    const message = await verifyOtp(email, candidate, isReset);

    // Si funciono, esta pantalla se desmonta con el resto de `(auth)`.
    if (message) {
      submittingRef.current = false;
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

    submittingRef.current = false;
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

            <OtpInput
              value={code}
              onChangeText={setCode}
              length={CODE_LENGTH}
              editable={!submitting}
              onComplete={(value) => void handleSubmit(value)}
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
});
