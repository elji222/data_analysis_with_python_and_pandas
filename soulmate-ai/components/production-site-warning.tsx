import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UI_VERSION } from '@/constants/chat-theme';

function isOldProductionSite() {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location.hostname.includes('expo.app')
  );
}

export function ProductionSiteWarning() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isOldProductionSite());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ThemedText style={styles.title}>This is the old website</ThemedText>
        <ThemedText style={styles.body}>
          soulmate-ai.expo.app has not been updated yet.
        </ThemedText>
        <ThemedText style={styles.body}>
          On your phone, open the address from your PC instead, for example:
        </ThemedText>
        <ThemedText style={styles.code}>http://192.168.x.x:8081/chat</ThemedText>
        <ThemedText style={styles.body}>
          Run scripts\start-phone-web.cmd on your PC to get the exact link.
        </ThemedText>
        <ThemedText style={styles.version}>Latest build: {UI_VERSION}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 17, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10000,
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
  code: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7B61FF',
    textAlign: 'center',
  },
  version: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A86B',
    textAlign: 'center',
    marginTop: 4,
  },
});
