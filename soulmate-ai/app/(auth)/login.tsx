import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { signInWithGoogle } from '@/lib/auth';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (signInError) {
      const message =
        signInError instanceof Error
          ? signInError.message
          : 'Could not sign in with Google. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
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
        <ThemedText style={styles.description}>
          Create your account with Google to save your conversations and pick up where you left off.
        </ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.pressed,
            isLoading && styles.disabled,
          ]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#1A1028" />
          ) : (
            <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
          )}
        </Pressable>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
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
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.85,
  },
  description: {
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 320,
    marginBottom: 8,
  },
  googleButton: {
    minWidth: 260,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  googleButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1A1028',
  },
  errorText: {
    color: '#D64545',
    textAlign: 'center',
    maxWidth: 320,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
});
