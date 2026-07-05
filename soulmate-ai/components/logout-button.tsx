import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import { useAuth } from '@/contexts/auth-context';
import { confirmAction } from '@/lib/confirm';

type LogoutButtonProps = {
  variant?: 'text' | 'row';
  onLoggedOut?: () => void;
};

export function LogoutButton({ variant = 'text', onLoggedOut }: LogoutButtonProps) {
  const { signOut, user } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    const confirmed = await confirmAction({
      title: 'Log out?',
      message: 'You will need to sign in again to use Soulmate AI.',
      confirmLabel: 'Log out',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await signOut();
      onLoggedOut?.();
      router.replace('/login');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not log out. Please try again.';
      Alert.alert('Log out failed', message);
    }
  }

  if (variant === 'row') {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => void handleLogout()}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </ThemedText>
        </View>
        <View style={styles.rowCopy}>
          <ThemedText numberOfLines={1} style={styles.email}>
            {user?.email ?? 'Signed in'}
          </ThemedText>
          <ThemedText style={styles.logoutLabel}>Log out</ThemedText>
        </View>
        <Ionicons name="log-out-outline" size={18} color={ChatTheme.sidebarMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
      onPress={() => void handleLogout()}>
      <ThemedText style={styles.textButtonLabel}>Log out</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  email: {
    fontSize: 13,
    color: ChatTheme.sidebarText,
  },
  logoutLabel: {
    fontSize: 12,
    color: ChatTheme.sidebarMuted,
  },
  textButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  textButtonLabel: {
    fontSize: 15,
    color: '#D64545',
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});
