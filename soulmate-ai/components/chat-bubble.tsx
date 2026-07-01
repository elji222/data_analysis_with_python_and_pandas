import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ChatMessage } from '@/types/chat';

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <ThemedView style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <ThemedView
        lightColor={isUser ? '#7B61FF' : '#F0EBFF'}
        darkColor={isUser ? '#6B52E8' : '#2A2438'}
        style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <ThemedText
          lightColor={isUser ? '#FFFFFF' : '#1A1028'}
          darkColor={isUser ? '#FFFFFF' : '#F3EEFF'}
          style={styles.text}>
          {message.text}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

type ChatTypingBubbleProps = {
  visible: boolean;
};

export function ChatTypingBubble({ visible }: ChatTypingBubbleProps) {
  if (!visible) return null;

  return (
    <ThemedView style={[styles.row, styles.rowAssistant]}>
      <ThemedView
        lightColor="#F0EBFF"
        darkColor="#2A2438"
        style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
        <ActivityIndicator color="#7B61FF" />
        <ThemedText
          lightColor="#1A1028"
          darkColor="#F3EEFF"
          style={styles.typingText}>
          Soulmate AI is thinking...
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typingText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
