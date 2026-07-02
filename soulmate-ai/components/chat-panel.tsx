import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble, StreamingPlaceholder } from '@/components/chat-bubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CHAT_SUGGESTIONS, ChatTheme } from '@/constants/chat-theme';
import { streamChatMessage } from '@/services/chat-api';
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
  const isDark = colorScheme === 'dark';
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messages = conversation?.messages ?? [];
  const isStreaming = streamingText !== null;
  const showThinking = isLoading && !isStreaming;

  useEffect(() => {
    setInput('');
    setError(null);
    setStreamingText(null);
    setIsLoading(false);
  }, [conversation?.id]);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }

  async function sendMessage(text: string) {
    if (!conversation) return;

    const trimmed = text.trim();
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
    setStreamingText(null);
    await onUpdateMessages(conversation.id, nextMessages);
    scrollToEnd();

    try {
      const reply = await streamChatMessage(
        nextMessages.map((message) => ({
          role: message.role,
          content: message.text,
        })),
        (partialText) => {
          setStreamingText(partialText);
          scrollToEnd();
        }
      );

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        text: reply,
        role: 'assistant',
        createdAt: Date.now(),
      };

      setStreamingText(null);
      await onUpdateMessages(conversation.id, [...nextMessages, assistantMessage]);
    } catch (sendError) {
      setStreamingText(null);
      const message =
        sendError instanceof Error ? sendError.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
      scrollToEnd();
    }
  }

  function handleSend() {
    void sendMessage(input);
  }

  const listData: ChatMessage[] =
    isStreaming && streamingText !== null
      ? [
          ...messages,
          {
            id: 'streaming-assistant',
            text: streamingText,
            role: 'assistant',
            createdAt: Date.now(),
          },
        ]
      : messages;

  return (
    <ThemedView
      lightColor={ChatTheme.pageBg}
      darkColor={ChatTheme.pageBgDark}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          {showSidebarToggle ? (
            <Pressable style={styles.menuButton} onPress={onOpenSidebar}>
              <ThemedText style={styles.menuLabel}>☰</ThemedText>
            </Pressable>
          ) : (
            <View style={styles.menuSpacer} />
          )}
          <ThemedText
            numberOfLines={1}
            lightColor={ChatTheme.assistantText}
            darkColor={ChatTheme.assistantTextDark}
            style={styles.headerTitle}>
            {conversation?.title ?? 'Soulmate AI'}
          </ThemedText>
          <View style={styles.menuSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messageList,
              listData.length === 0 && !showThinking && styles.messageListEmpty,
            ]}
            onContentSizeChange={scrollToEnd}
            ListEmptyComponent={
              !showThinking ? (
                <View style={styles.emptyState}>
                  <ThemedText
                    lightColor={ChatTheme.assistantText}
                    darkColor={ChatTheme.assistantTextDark}
                    style={styles.emptyTitle}>
                    How can I help you today?
                  </ThemedText>
                  <View style={styles.suggestions}>
                    {CHAT_SUGGESTIONS.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        style={({ pressed }) => [
                          styles.suggestionChip,
                          {
                            borderColor: isDark
                              ? ChatTheme.inputBorderDark
                              : ChatTheme.inputBorder,
                            backgroundColor: isDark ? ChatTheme.inputBgDark : ChatTheme.pageBg,
                          },
                          pressed && styles.pressed,
                        ]}
                        onPress={() => void sendMessage(suggestion)}>
                        <ThemedText style={styles.suggestionText}>{suggestion}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null
            }
            ListFooterComponent={<StreamingPlaceholder visible={showThinking} />}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isStreaming={item.id === 'streaming-assistant' && isStreaming}
              />
            )}
          />

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <View style={styles.inputArea}>
            <View
              style={[
                styles.inputShell,
                {
                  backgroundColor: isDark ? ChatTheme.inputBgDark : ChatTheme.inputBg,
                  borderColor: isDark ? ChatTheme.inputBorderDark : ChatTheme.inputBorder,
                },
              ]}>
              <TextInput
                style={[
                  styles.input,
                  { color: isDark ? ChatTheme.assistantTextDark : ChatTheme.assistantText },
                ]}
                placeholder="Message Soulmate AI..."
                placeholderTextColor={ChatTheme.inputPlaceholder}
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
                  pressed && styles.pressed,
                  (!input.trim() || isLoading) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!input.trim() || isLoading}>
                <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.sendIcon}>
                  ↑
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText style={styles.disclaimer}>
              Soulmate AI can make mistakes. Consider checking important information.
            </ThemedText>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ChatTheme.inputBorder,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSpacer: {
    width: 36,
    height: 36,
  },
  menuLabel: {
    fontSize: 18,
    lineHeight: 20,
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    width: '100%',
    maxWidth: ChatTheme.contentMaxWidth,
    alignSelf: 'center',
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 8,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  suggestions: {
    width: '100%',
    gap: 10,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggestionText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.85,
  },
  errorText: {
    color: ChatTheme.error,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 14,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    width: '100%',
    maxWidth: ChatTheme.contentMaxWidth + 32,
    alignSelf: 'center',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: {
    flex: 1,
    minHeight: 28,
    maxHeight: 160,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.accent,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  disclaimer: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.45,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
