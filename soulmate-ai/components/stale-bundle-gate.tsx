import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UI_VERSION } from '@/constants/chat-theme';
import {
  getStaleBundleHelpText,
  hardRefreshWebBundle,
  recoverStaleWebBundle,
  type StaleBundleState,
} from '@/lib/recover-stale-web-bundle';

export function StaleBundleGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StaleBundleState>(
    Platform.OS === 'web' ? 'checking' : 'ready'
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let cancelled = false;

    void recoverStaleWebBundle().then((nextState) => {
      if (!cancelled) {
        setState(nextState);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS !== 'web' || state === 'checking') {
    return <>{children}</>;
  }

  if (state === 'ready') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>Phone needs a fresh copy</ThemedText>
          <ThemedText style={styles.body}>{getStaleBundleHelpText()}</ThemedText>
          <ThemedText style={styles.body}>
            Tap the button below. If it still looks old, open Chrome menu {'>'} Settings {'>'} Site
            settings, find your PC address, and Clear & reset.
          </ThemedText>
          <ThemedText style={styles.version}>Latest build: {UI_VERSION}</ThemedText>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => void hardRefreshWebBundle()}>
            <ThemedText style={styles.buttonLabel}>Load newest version</ThemedText>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 17, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10001,
  },
  card: {
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444444',
    textAlign: 'center',
  },
  version: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0084FF',
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0084FF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
