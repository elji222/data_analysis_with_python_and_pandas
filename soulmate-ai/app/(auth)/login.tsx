import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UI_VERSION } from '@/constants/chat-theme';
import { useAuth } from '@/contexts/auth-context';
import { getAuthRedirectUri, processAuthCallbackUrl, signInWithGoogle } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (session) {
      router.replace('/chat');
    }
  }, [session, router]);

  useEffect(() => {
    async function handleCallbackUrl(url: string | null) {
      if (!url) return;

      if (url.includes('error=')) {
        setError('Google sign-in failed. Check Supabase redirect URLs.');
        setIsLoading(false);
        return;
      }

      if (!url.includes('code=') && !url.includes('access_token=')) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setStatusMessage('Finishing sign-in...');
        const handled = await processAuthCallbackUrl(url);
        if (handled && Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, '/login');
        }
      } catch (callbackError) {
        const message =
          callbackError instanceof Error
            ? callbackError.message
            : 'Could not complete Google sign-in. Please try again.';
        setError(message);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
      }
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      void handleCallbackUrl(window.location.href);
      return;
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
      setStatusMessage('Opening Google sign-in in your browser...');
      await signInWithGoogle();
      setStatusMessage(null);
    } catch (signInError) {
      const message =
        signInError instanceof Error
          ? signInError.message
          : 'Could not sign in with Google. Please try again.';
      setError(message);
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <View style={styles.buildBadge}>
          <ThemedText style={styles.buildBadgeText}>EXPO GO BUILD {UI_VERSION}</ThemedText>
        </View>

        <ThemedText type="title" style={styles.title}>
          Soulmate AI
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Your AI companion
        </ThemedText>
        <ThemedText style={styles.description}>
          Create your account with Google to sync chats and memories across your phone and laptop.
        </ThemedText>

        {Platform.OS !== 'web' ? (
          <ThemedText style={styles.phoneHint}>
            Expo Go is unreliable on this project. On your phone, use Safari or Chrome and open the
            http://YOUR-PC-IP:8081/chat link from scripts\start-phone-web.cmd
          </ThemedText>
        ) : null}

        {!isConfigured ? (
          <ThemedView style={styles.configCard}>
            <ThemedText style={styles.configTitle}>Setup required</ThemedText>
            <ThemedText style={styles.configText}>
              Add your Supabase URL and publishable key to `.env`, then restart Expo.
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

        {statusMessage ? <ThemedText style={styles.statusText}>{statusMessage}</ThemedText> : null}

        {isConfigured ? (
          <ThemedText style={styles.redirectHint}>
            {Platform.OS === 'web'
              ? `Redirect URL: ${getAuthRedirectUri()}`
              : `Supabase Redirect URLs must include:\nexp://**\n${getAuthRedirectUri()}`}
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
  buildBadge: {
    backgroundColor: '#7B61FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
  },
  buildBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
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
  phoneHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#7B61FF',
    maxWidth: 320,
    fontWeight: '600',
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
  statusText: {
    fontSize: 14,
    color: '#7B61FF',
    textAlign: 'center',
    maxWidth: 320,
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
