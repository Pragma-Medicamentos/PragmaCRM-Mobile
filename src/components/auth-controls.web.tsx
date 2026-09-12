import { Show } from '@clerk/expo';
import { SignInButton, UserButton } from '@clerk/expo/web';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

/**
 * Web counterpart of auth-controls.tsx. Clerk's native components are iOS/Android
 * only, so the web build uses Clerk's hosted modal components instead.
 */
export function AuthControls() {
  return (
    <View style={styles.container}>
      <Show when="signed-out">
        <SignInButton mode="modal" />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 36,
  },
});
