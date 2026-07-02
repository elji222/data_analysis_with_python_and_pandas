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
        <ThemedText style={styles.title}>This site is out of date</ThemedText>
        <ThemedText style={styles.body}>
          The live website has not been updated with the latest phone UI yet.
        </ThemedText>
        <ThemedText style={styles.body}>
          On your PC, run this once to publish the latest version:
        </ThemedText>
        <ThemedText style={styles.code}>scripts\deploy-live-site.cmd</ThemedText>
        <ThemedText style={styles.body}>
          Or for testing on Wi-Fi, run:
        </ThemedText>
        <ThemedText style={styles.code}>scripts\open-on-phone.cmd</ThemedText>
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
