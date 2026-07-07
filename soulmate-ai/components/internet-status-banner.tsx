import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PRODUCTION_CHAT_URL } from '@/constants/app-urls';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isLocalDevWebHost } from '@/lib/api-origin';

type InternetStatusBannerProps = {
  variant?: 'login' | 'chat';
};

export function InternetStatusBanner({ variant = 'chat' }: InternetStatusBannerProps) {
  const isOnline = useOnlineStatus();
  const showLocalDevHint = Platform.OS === 'web' && isLocalDevWebHost();

  if (isOnline && !showLocalDevHint) {
    return null;
  }

  async function openProductionSite() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign(PRODUCTION_CHAT_URL);
      return;
    }

    await Linking.openURL(PRODUCTION_CHAT_URL);
  }

  return (
    <View style={styles.container}>
      {!isOnline ? (
        <>
          <ThemedText style={styles.title}>No internet connection</ThemedText>
          <ThemedText style={styles.body}>
            Soulmate AI needs the internet for Google sign-in, chat, and cloud sync.
          </ThemedText>
        </>
      ) : null}

      {showLocalDevHint ? (
        <>
          <ThemedText style={styles.title}>
            {variant === 'login' ? 'Want to use Soulmate anywhere?' : 'Using a local PC link'}
          </ThemedText>
          <ThemedText style={styles.body}>
            This page only works while your PC is on and you are on the same Wi-Fi. For internet
            access on phone data or any network, use the live site.
          </ThemedText>
          <Pressable style={styles.button} onPress={() => void openProductionSite()}>
            <ThemedText style={styles.buttonLabel}>Open {PRODUCTION_CHAT_URL}</ThemedText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#7B61FF',
    backgroundColor: '#F3EEFF',
    gap: 8,
  },
  title: {
    fontWeight: '700',
    color: '#4A2F8F',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4A2F8F',
    textAlign: 'center',
  },
  button: {
    alignSelf: 'center',
    backgroundColor: '#7B61FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
