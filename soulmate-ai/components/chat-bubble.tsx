import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ChatMessage } from '@/types/chat';

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <ThemedView style={styles.row}>
      <ThemedView
        lightColor="#7B61FF"
        darkColor="#6B52E8"
        style={styles.bubble}>
        <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.text}>
          {message.text}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
