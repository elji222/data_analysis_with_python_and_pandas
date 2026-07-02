import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble, StreamingPlaceholder } from '@/components/chat-bubble';
import { ChatComposer } from '@/components/chat-composer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatTheme, QUICK_ACTIONS } from '@/constants/chat-theme';
import { useSmoothStreamingText } from '@/hooks/use-smooth-streaming-text';
import { isDefaultConversationTitle } from '@/lib/conversation-title';
import { streamChatMessage } from '@/services/chat-api';
import { fetchConversationTitle } from '@/services/title-api';
import type { ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

type ChatPanelProps = {
  conversation: Conversation | null;
  onUpdateMessages: (conversationId: string, messages: ChatMessage[]) => Promise<void>;
  onRenameConversation?: (conversationId: string, title: string) => Promise<void>;
  onOpenSidebar?: () => void;
  showSidebarToggle?: boolean;
  userEmail?: string | null;
};

export function ChatPanel({
  conversation,
  onUpdateMessages,
  onRenameConversation,
  onOpenSidebar,
  showSidebarToggle = false,
  userEmail,
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
  const smoothStreamingText = useSmoothStreamingText(streamingText, isStreaming);
  const showThinking = isLoading && !isStreaming;
  const isNewChat = isDefaultConversationTitle(conversation?.title ?? 'New chat');
  const showHeroEmpty =
    messages.length === 0 && !showThinking && !isStreaming && isNewChat;

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

  useEffect(() => {
    if (!isStreaming) return;
    scrollToEnd();
  }, [smoothStreamingText, isStreaming]);

  async function sendMessage(text: string) {
    if (!conversation) return;

    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const isFirstExchange = messages.length === 0;

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

      if (isFirstExchange && onRenameConversation) {
        const title = await fetchConversationTitle(trimmed);
        await onRenameConversation(conversation.id, title);
      }
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
    isStreaming
      ? [
          ...messages,
          {
            id: 'streaming-assistant',
            text: smoothStreamingText,
            role: 'assistant',
            createdAt: Date.now(),
          },
        ]
      : messages;

  const userInitial = userEmail?.charAt(0).toUpperCase() ?? '?';

  return (
    <ThemedView
      lightColor={ChatTheme.pageBg}
      darkColor={ChatTheme.pageBgDark}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          {showSidebarToggle ? (
            <Pressable style={styles.headerButton} onPress={onOpenSidebar}>
              <Ionicons
                name="menu-outline"
                size={22}
                color={isDark ? ChatTheme.sidebarTextDark : ChatTheme.sidebarText}
              />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <View style={styles.headerSpacer} />
          <View style={styles.profileButton}>
            <ThemedText style={styles.profileInitial}>{userInitial}</ThemedText>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
          <View style={styles.mainColumn}>
          {showHeroEmpty ? (
            <View style={styles.heroState}>
              <ThemedText
                lightColor={ChatTheme.assistantText}
                darkColor={ChatTheme.assistantTextDark}
                style={styles.heroTitle}>
                What&apos;s on your mind today?
              </ThemedText>

              <ChatComposer
                variant="hero"
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                isLoading={isLoading}
              />

              <View style={styles.quickActions}>
                {QUICK_ACTIONS.map((action) => (
                  <Pressable
                    key={action.label}
                    style={({ pressed }) => [
                      styles.quickActionChip,
                      {
                        borderColor: isDark ? ChatTheme.inputBorderDark : ChatTheme.inputBorder,
                        backgroundColor: isDark ? ChatTheme.inputBgDark : ChatTheme.pageBg,
                      },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => void sendMessage(action.prompt)}>
                    <Ionicons
                      name={action.icon}
                      size={16}
                      color={isDark ? ChatTheme.sidebarMutedDark : ChatTheme.sidebarMuted}
                    />
                    <ThemedText style={styles.quickActionLabel}>{action.label}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.threadArea}>
              <FlatList
                ref={listRef}
                data={listData}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageList}
                onContentSizeChange={scrollToEnd}
                ListFooterComponent={<StreamingPlaceholder visible={showThinking} />}
                renderItem={({ item }) => (
                  <ChatBubble
                    message={item}
                    isStreaming={item.id === 'streaming-assistant' && isStreaming}
                  />
                )}
              />

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <View style={styles.bottomComposerArea}>
                <ChatComposer
                  value={input}
                  onChangeText={setInput}
                  onSend={handleSend}
                  isLoading={isLoading}
                />
                <ThemedText style={styles.disclaimer}>
                  Soulmate AI can make mistakes. Consider checking important information.
                </ThemedText>
              </View>
            </View>
          )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  mainColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 48,
    gap: 24,
    width: '100%',
    maxWidth: 680,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.3,
    width: '100%',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickActionLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: ChatTheme.sidebarText,
  },
  threadArea: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
  },
  messageList: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 16,
    width: '100%',
    flexGrow: 1,
  },
  errorText: {
    color: ChatTheme.error,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 14,
  },
  bottomComposerArea: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
    width: '100%',
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
