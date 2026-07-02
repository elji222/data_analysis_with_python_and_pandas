import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { UI_VERSION } from '@/constants/chat-theme';
import { useMobileChatLayout } from '@/hooks/use-mobile-chat-layout';

export function BuildVersionBanner() {
  const insets = useSafeAreaInsets();
  const isMobileChatLayout = useMobileChatLayout();

  return (
    <View pointerEvents="none" style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={[styles.banner, isMobileChatLayout && styles.bannerMobile]}>
        <ThemedText style={styles.bannerText}>
          {isMobileChatLayout ? `PHONE BUILD ${UI_VERSION}` : `LIVE BUILD ${UI_VERSION}`}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  banner: {
    backgroundColor: '#00A86B',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },
  bannerMobile: {
    backgroundColor: '#0084FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
