import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Button } from './ui/button';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

type Props = {
  title: string;
  message: string;
  /** Se ofrece solo cuando reintentar puede resolverlo (por ejemplo, sin red). */
  onRetry?: () => void;
};

export function AccessDenied({ title, message, onRetry }: Props) {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.centered}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          {message}
        </ThemedText>

        {onRetry ? <Button title="Reintentar" onPress={onRetry} /> : null}
        <Button title="Cerrar sesión" variant="secondary" onPress={() => void signOut()} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
});
