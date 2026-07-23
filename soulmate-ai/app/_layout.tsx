import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { StaleBundleGate } from '@/components/stale-bundle-gate';
import { ThemedText } from '@/components/themed-text';
import { UI_VERSION } from '@/constants/chat-theme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ChatIntentProvider } from '@/contexts/chat-intent-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasAuthCallbackInUrl } from '@/lib/auth';
import { normalizeStaleBuildQuery } from '@/lib/build-version';
import { enforceCurrentBuild } from '@/lib/enforce-build-version';

if (Platform.OS === 'web') {
  normalizeStaleBuildQuery(UI_VERSION);
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { session, isLoading, isAccessLoading, hasAccess, accessError } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void enforceCurrentBuild();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    document.title = 'Soulmate AI';
  }, []);

  useEffect(() => {
    if (isLoading || isAccessLoading || hasAuthCallbackInUrl()) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (session && hasAccess && inAuthGroup) {
      router.replace('/chat');
      return;
    }

    if (session && !hasAccess && !inAuthGroup) {
      router.replace(accessError ? '/login' : '/login');
      return;
    }

    if (session && hasAccess && segments[0] === '(tabs)' && segments[1] === 'index') {
      router.replace('/chat');
    }
  }, [session, isLoading, isAccessLoading, hasAccess, accessError, segments, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StaleBundleGate>
        <View style={styles.shell}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>

          {isLoading || isAccessLoading ? (
            <View style={styles.bootstrapOverlay}>
              <ActivityIndicator color="#7B61FF" size="large" />
              <ThemedText style={styles.bootstrapText}>
                {hasAuthCallbackInUrl()
                  ? 'Finishing sign-in...'
                  : isAccessLoading
                    ? 'Checking your invite...'
                    : 'Loading Soulmate AI...'}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <StatusBar style="auto" />
      </StaleBundleGate>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatIntentProvider>
        <RootNavigator />
      </ChatIntentProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  bootstrapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    zIndex: 10000,
  },
  bootstrapText: {
    opacity: 0.7,
  },
});
