import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';

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

      <ThemedText style={styles.title}>Soulmate AI</ThemedText>

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
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
});
