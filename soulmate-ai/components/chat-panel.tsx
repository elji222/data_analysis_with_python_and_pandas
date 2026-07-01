import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble, ChatTypingBubble } from '@/components/chat-bubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { sendChatMessage } from '@/services/chat-api';
import type { ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

type ChatPanelProps = {
  conversation: Conversation | null;
  onUpdateMessages: (conversationId: string, messages: ChatMessage[]) => Promise<void>;
  onOpenSidebar?: () => void;
  showSidebarToggle?: boolean;
};

export function ChatPanel({
  conversation,
  onUpdateMessages,
  onOpenSidebar,
  showSidebarToggle = false,
}: ChatPanelProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = conversation?.messages ?? [];

  useEffect(() => {
    setInput('');
    setError(null);
  }, [conversation?.id]);

  async function handleSend() {
    if (!conversation) return;

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      text: trimmed,
      role: 'user',
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMessage];

    setInput('');
    setError(null);
    setIsLoading(true);
    await onUpdateMessages(conversation.id, nextMessages);

    try {
      const reply = await sendChatMessage(
        nextMessages.map((message) => ({
          role: message.role,
          content: message.text,
        }))
      );

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        text: reply,
        role: 'assistant',
        createdAt: Date.now(),
      };

      await onUpdateMessages(conversation.id, [...nextMessages, assistantMessage]);
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerTop}>
            {showSidebarToggle ? (
              <Pressable style={styles.menuButton} onPress={onOpenSidebar}>
                <ThemedText style={styles.menuLabel}>☰</ThemedText>
              </Pressable>
            ) : null}
            <ThemedView style={styles.headerText}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {conversation?.title ?? 'Chat'}
              </ThemedText>
              <ThemedText style={styles.headerHint}>Soulmate AI is here to talk with you</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && !isLoading && styles.messageListEmpty,
            ]}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              !isLoading ? (
                <ThemedText style={styles.emptyText}>
                  Say hello to Soulmate AI. Your companion will reply here.
                </ThemedText>
              ) : null
            }
            ListFooterComponent={<ChatTypingBubble visible={isLoading} />}
            renderItem={({ item }) => <ChatBubble message={item} />}
          />

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <ThemedView style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colorScheme === 'dark' ? '#333' : '#E0E0E0',
                  backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F8F8F8',
                },
              ]}
              placeholder="Type a message..."
              placeholderTextColor={colors.icon}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              editable={!isLoading}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                pressed && styles.sendButtonPressed,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || isLoading}>
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.sendLabel}>
                Send
              </ThemedText>
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EBFF',
  },
  menuLabel: {
    fontSize: 18,
    lineHeight: 20,
  },
  headerHint: {
    fontSize: 14,
    opacity: 0.6,
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#D64545',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#7B61FF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    fontWeight: '600',
    fontSize: 15,
  },
});
