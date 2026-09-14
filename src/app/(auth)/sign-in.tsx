import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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

export default function SignInScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(undefined);

    const message = await signIn(email, password);

    // Si funciono, el guard del layout raiz desmonta esta pantalla; solo hay
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
              <BrandLogo />
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                Ingresa con la cuenta que te asignó tu administrador.
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
              returnKeyType="next"
              editable={!submitting}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <TextField
              ref={passwordRef}
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              editable={!submitting}
              onSubmitEditing={() => void handleSubmit()}
            />

            <Pressable
              onPress={() => setPasswordVisible((visible) => !visible)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                {passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              </ThemedText>
            </Pressable>

            {error ? (
              <ThemedText type="small" themeColor="danger" style={styles.centered}>
                {error}
              </ThemedText>
            ) : null}

            <Button
              title="Iniciar sesión"
              onPress={() => void handleSubmit()}
              loading={submitting}
              disabled={!canSubmit}
            />

            {/*
              El mismo flujo de codigo sirve para el primer ingreso y para la
              recuperacion, asi que un solo enlace cubre ambos casos y el
              administrador deja de reenviar credenciales a mano.
            */}
            <Link href="/otp" asChild>
              <Pressable
                accessibilityRole="link"
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="tint" style={styles.centered}>
                  ¿Primera vez aquí o no recuerdas tu contraseña?
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
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
