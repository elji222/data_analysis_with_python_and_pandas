import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
    <ThemedView
      lightColor="#F7F4FF"
      darkColor="#17121F"
      style={styles.sidebar}>
      <Pressable
        style={({ pressed }) => [styles.newChatButton, pressed && styles.pressed]}
        onPress={onNewConversation}>
        <ThemedText style={styles.newChatLabel}>+ New chat</ThemedText>
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
                <ThemedText numberOfLines={2} style={styles.conversationTitle}>
                  {item.title}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                onPress={() => onDeleteConversation(item.id)}>
                <ThemedText style={styles.deleteLabel}>×</ThemedText>
              </Pressable>
            </View>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E0E0E0',
    paddingTop: 12,
  },
  newChatButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8CCFF',
    backgroundColor: '#FFFFFF',
  },
  newChatLabel: {
    fontWeight: '600',
    color: '#7B61FF',
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 4,
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
    borderRadius: 10,
  },
  conversationButtonActive: {
    backgroundColor: '#E9E0FF',
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
  deleteLabel: {
    fontSize: 20,
    lineHeight: 20,
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
