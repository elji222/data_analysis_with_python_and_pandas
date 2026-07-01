import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
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
});
