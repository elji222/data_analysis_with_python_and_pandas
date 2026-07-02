import { StyleSheet, View } from 'react-native';

import { FormattedMessageText } from '@/components/formatted-message-text';
import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ChatMessage } from '@/types/chat';

type ChatBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
};

export function ChatBubble({ message, isStreaming = false }: ChatBubbleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View
          style={[
            styles.userBubble,
            { backgroundColor: isDark ? ChatTheme.userBubbleDark : ChatTheme.userBubble },
          ]}>
          <FormattedMessageText
            lightColor="#0D0D0D"
            darkColor="#ECECEC"
            style={styles.messageText}
            text={message.text}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <FormattedMessageText
        lightColor={ChatTheme.assistantText}
        darkColor={ChatTheme.assistantTextDark}
        style={styles.messageText}
        text={message.text}
        suffix={isStreaming ? '▍' : undefined}
      />
    </View>
  );
}

type StreamingPlaceholderProps = {
  visible: boolean;
};

export function StreamingPlaceholder({ visible }: StreamingPlaceholderProps) {
  if (!visible) return null;

  return (
    <View style={styles.assistantRow}>
      <ThemedText style={styles.thinkingText}>Soulmate AI is thinking...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  assistantRow: {
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 26,
  },
  thinkingText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.55,
    fontStyle: 'italic',
  },
});
