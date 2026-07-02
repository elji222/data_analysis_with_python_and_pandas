import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import type { Conversation } from '@/types/conversation';

type ConversationSidebarProps = {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
};

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  return (
    <View style={styles.sidebar}>
      <Pressable
        style={({ pressed }) => [styles.newChatButton, pressed && styles.pressed]}
        onPress={onNewConversation}>
        <ThemedText lightColor={ChatTheme.sidebarText} darkColor={ChatTheme.sidebarText}>
          + New chat
        </ThemedText>
      </Pressable>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === activeConversationId;

          return (
            <View style={styles.row}>
              <Pressable
                style={({ pressed }) => [
                  styles.conversationButton,
                  isActive && styles.conversationButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelectConversation(item.id)}>
                <ThemedText
                  numberOfLines={1}
                  lightColor={ChatTheme.sidebarText}
                  darkColor={ChatTheme.sidebarText}
                  style={styles.conversationTitle}>
                  {item.title}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                onPress={() => onDeleteConversation(item.id)}>
                <ThemedText lightColor={ChatTheme.sidebarMuted} darkColor={ChatTheme.sidebarMuted}>
                  ×
                </ThemedText>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: ChatTheme.sidebarBg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: ChatTheme.sidebarBorder,
    paddingTop: 12,
  },
  newChatButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ChatTheme.sidebarBorder,
    backgroundColor: ChatTheme.sidebarHover,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  conversationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  conversationButtonActive: {
    backgroundColor: ChatTheme.sidebarActive,
  },
  conversationTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.75,
  },
});
