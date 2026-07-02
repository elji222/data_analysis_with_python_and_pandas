import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { FormattedMessageText } from '@/components/formatted-message-text';
import { StreamingCursor } from '@/components/streaming-cursor';
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
  const attachments = message.attachments ?? [];

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View
          style={[
            styles.userBubble,
            { backgroundColor: isDark ? ChatTheme.userBubbleDark : ChatTheme.userBubble },
          ]}>
          {attachments.length > 0 ? (
            <View style={styles.attachmentStack}>
              {attachments.map((attachment) =>
                attachment.kind === 'image' ? (
                  <Image
                    key={attachment.id}
                    source={{ uri: attachment.uri }}
                    style={styles.messageImage}
                    contentFit="cover"
                  />
                ) : (
                  <View key={attachment.id} style={styles.fileChip}>
                    <Ionicons name="document-outline" size={16} color={ChatTheme.sidebarMuted} />
                    <ThemedText numberOfLines={1} style={styles.fileName}>
                      {attachment.name}
                    </ThemedText>
                  </View>
                )
              )}
            </View>
          ) : null}

          {message.text ? (
            <FormattedMessageText
              lightColor="#0D0D0D"
              darkColor="#ECECEC"
              style={[
                styles.messageText,
                attachments.length > 0 ? styles.messageTextWithAttachment : undefined,
              ]}
              text={message.text}
            />
          ) : null}
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
        suffix={isStreaming ? <StreamingCursor /> : undefined}
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
  attachmentStack: {
    gap: 8,
    marginBottom: 8,
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 14,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: ChatTheme.sidebarText,
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
  messageTextWithAttachment: {
    marginTop: 4,
  },
  thinkingText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.55,
    fontStyle: 'italic',
  },
});
