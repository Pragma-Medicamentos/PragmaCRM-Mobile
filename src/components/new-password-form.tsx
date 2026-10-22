import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { ThemedText } from './themed-text';
import { Button } from './ui/button';
import { TextField } from './ui/text-field';

import { PASSWORD_MIN_LENGTH, validateNewPassword } from '@/lib/password';

type Props = {
  submitLabel: string;
  /** Devuelve un mensaje en español si falló, o undefined si funcionó. */
  onSubmit: (password: string) => Promise<string | undefined>;
  /** Se deshabilita junto con el formulario mientras se guarda. */
  renderSecondaryAction?: (submitting: boolean) => ReactNode;
};

/**
 * Nueva contraseña + confirmacion. Lo comparten la contraseña definitiva tras
 * entrar por codigo (`set-password`) y el cambio desde Mi perfil (PCRM-204).
 *
 * Ante un fallo los campos se conservan: el vendedor reintenta sin volver a
 * escribir, que es justo lo que pasa sin red.
 */
export function NewPasswordForm({ submitLabel, onSubmit, renderSecondaryAction }: Props) {
  const confirmationRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;

    const invalid = validateNewPassword(password, confirmation);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    setError(undefined);

    const message = await onSubmit(password);

    // Si funciono, quien monta el formulario decide a donde ir (en
    // `set-password` el guard lo desmonta); solo hay que devolverlo a su
    // estado normal cuando fallo.
    if (message) {
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <TextField
        label="Nueva contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
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
        title={submitLabel}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={submitting}
      />

      {renderSecondaryAction?.(submitting)}
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    textAlign: 'center',
  },
});
