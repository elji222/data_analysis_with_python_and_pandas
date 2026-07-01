import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getAuthRedirectUri, processAuthCallbackUrl, signInWithGoogle } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location.href.includes('error=')) {
        void processAuthCallbackUrl(window.location.href).catch((callbackError) => {
          const message =
            callbackError instanceof Error
              ? callbackError.message
              : 'Could not complete Google sign-in. Please try again.';
          setError(message);
        });
      }
      return;
    }

    async function handleCallbackUrl(url: string | null) {
      if (!url) return;

      try {
        setIsLoading(true);
        setError(null);
        await processAuthCallbackUrl(url);
      } catch (callbackError) {
        const message =
          callbackError instanceof Error
            ? callbackError.message
            : 'Could not complete Google sign-in. Please try again.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void Linking.getInitialURL().then(handleCallbackUrl);

    const subscription = Linking.addEventListener('url', (event) => {
      void handleCallbackUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

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

        {!isConfigured ? (
          <ThemedView style={styles.configCard}>
            <ThemedText style={styles.configTitle}>Setup required</ThemedText>
            <ThemedText style={styles.configText}>
              Add your Supabase URL and anon key to `.env`, then restart Expo.
            </ThemedText>
          </ThemedView>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.pressed,
            (isLoading || !isConfigured) && styles.disabled,
          ]}
          onPress={handleGoogleSignIn}
          disabled={isLoading || !isConfigured}>
          {isLoading ? (
            <ActivityIndicator color="#1A1028" />
          ) : (
            <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
          )}
        </Pressable>

        {isConfigured ? (
          <ThemedText style={styles.redirectHint}>
            Redirect URL: {getAuthRedirectUri()}
          </ThemedText>
        ) : null}

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
  configCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0C080',
    backgroundColor: '#FFF8E8',
    maxWidth: 320,
    gap: 6,
  },
  configTitle: {
    fontWeight: '600',
    color: '#8A5A00',
  },
  configText: {
    fontSize: 14,
    opacity: 0.85,
    color: '#8A5A00',
    textAlign: 'center',
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
  redirectHint: {
    fontSize: 12,
    opacity: 0.55,
    textAlign: 'center',
    maxWidth: 320,
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
