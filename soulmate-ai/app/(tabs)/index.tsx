import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { signOut } from '@/lib/auth';

export default function HomeScreen() {
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Soulmate AI
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Your AI companion
        </ThemedText>
        <ThemedText style={styles.tagline}>
          Meaningful connection, one conversation at a time.
        </ThemedText>

        {user ? (
          <ThemedView style={styles.accountCard}>
            <ThemedText style={styles.signedInLabel}>Signed in as</ThemedText>
            <ThemedText type="defaultSemiBold">{user.email}</ThemedText>
            <Link href="/memory" asChild>
              <Pressable style={({ pressed }) => [styles.memoryLink, pressed && styles.pressed]}>
                <ThemedText style={styles.memoryLinkText}>Open Memory</ThemedText>
              </Pressable>
            </Link>
            <Pressable
              style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
              onPress={handleSignOut}
              disabled={isSigningOut}>
              <ThemedText style={styles.signOutText}>
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.85,
  },
  tagline: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    maxWidth: 280,
  },
  accountCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    minWidth: 260,
  },
  signedInLabel: {
    opacity: 0.6,
    fontSize: 14,
  },
  memoryLink: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
  },
  memoryLinkText: {
    color: '#7B61FF',
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  signOutText: {
    color: '#7B61FF',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
