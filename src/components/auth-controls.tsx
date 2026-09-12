import { useAuth } from '@clerk/expo';
import { AuthView, UserButton } from '@clerk/expo/native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

/**
 * Signed-out: a button that opens Clerk's native sign-in / sign-up sheet.
 * Signed-in: Clerk's native user button, which opens the account profile.
 *
 * `treatPendingAsSignedOut: false` keeps pending session tasks from reading as
 * signed out mid-flow, and the modal stays mounted outside the branch so it
 * survives the moment auth state flips.
 */
export function AuthControls() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <View style={styles.container}>
      {!isLoaded ? (
        <ActivityIndicator />
      ) : isSignedIn ? (
        <UserButton />
      ) : (
        <Pressable
          onPress={() => setIsAuthOpen(true)}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.button}>
            <ThemedText type="smallBold">Sign in</ThemedText>
          </ThemedView>
        </Pressable>
      )}

      <Modal
        animationType="slide"
        visible={isAuthOpen}
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAuthOpen(false)}>
        <AuthView mode="signIn" onDismiss={() => setIsAuthOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
