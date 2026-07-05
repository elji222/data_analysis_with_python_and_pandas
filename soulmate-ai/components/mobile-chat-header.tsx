import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme, UI_VERSION } from '@/constants/chat-theme';

type MobileChatHeaderProps = {
  onOpenSidebar: () => void;
  onNewChat: () => void;
};

export function MobileChatHeader({ onOpenSidebar, onNewChat }: MobileChatHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header} testID="mobile-chat-header">
      <Pressable style={styles.iconButton} onPress={onOpenSidebar} accessibilityLabel="Open menu">
        <Ionicons name="reorder-two" size={24} color={ChatTheme.sidebarText} />
      </Pressable>

      <Pressable style={styles.modelPill}>
        <ThemedText style={styles.modelPillText}>Soulmate AI</ThemedText>
        <ThemedText style={styles.buildTag}>Build {UI_VERSION}</ThemedText>
      </Pressable>

      <View style={styles.rightActions}>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/memory')}
          accessibilityLabel="Open memory">
          <Ionicons name="bookmark-outline" size={22} color={ChatTheme.sidebarText} />
        </Pressable>

        <Pressable style={styles.iconButton} onPress={onNewChat} accessibilityLabel="New chat">
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={ChatTheme.sidebarText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 2,
  },
  modelPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  buildTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00A86B',
    letterSpacing: 0.2,
  },
});
