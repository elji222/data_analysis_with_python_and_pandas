import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble, StreamingPlaceholder } from '@/components/chat-bubble';
import { ChatComposer } from '@/components/chat-composer';
import { ChatScrollRail } from '@/components/chat-scroll-rail';
import { ScrollToBottomButton } from '@/components/scroll-to-bottom-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatTheme, QUICK_ACTIONS } from '@/constants/chat-theme';
import { useSmoothStreamingText } from '@/hooks/use-smooth-streaming-text';
import { useVoiceInput } from '@/hooks/use-voice-input';
import {
  canAddImageAttachment,
  pickPhotosAndFiles,
  shouldShowCameraOption,
  takePhoto,
} from '@/lib/attachments';
import {
  buildUserScrollMarkers,
  getActiveUserMarkerId,
  getScrollProgress,
  shouldShowScrollToBottom,
  type ScrollMetrics,
} from '@/lib/chat-scroll';
import { getMessagePreviewText, cloneAttachments } from '@/lib/build-chat-api-messages';
import { isDefaultConversationTitle } from '@/lib/conversation-title';
import { streamChatMessage } from '@/services/chat-api';
import { fetchConversationTitle } from '@/services/title-api';
import type { ChatAttachment, ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

type ChatPanelProps = {
  conversation: Conversation | null;
  onUpdateMessages: (conversationId: string, messages: ChatMessage[]) => Promise<void>;
  onRenameConversation?: (conversationId: string, title: string) => Promise<void>;
  onOpenSidebar?: () => void;
  showSidebarToggle?: boolean;
  storageWarning?: string | null;
  userEmail?: string | null;
};

export function ChatPanel({
  conversation,
  onUpdateMessages,
  onRenameConversation,
  onOpenSidebar,
  showSidebarToggle = false,
  storageWarning = null,
  userEmail,
}: ChatPanelProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [scrollMetrics, setScrollMetrics] = useState<ScrollMetrics>({
    offsetY: 0,
    contentHeight: 0,
    viewportHeight: 0,
  });
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const inputBeforeRecordingRef = useRef('');
  const listDataRef = useRef<ChatMessage[]>([]);

  const {
    isRecording,
    isSupported,
    transcript: recordingTranscript,
    audioLevels,
    startRecording,
    cancelRecording,
    confirmRecording,
  } = useVoiceInput();

  const messages = conversation?.messages ?? [];
  const isStreaming = streamingText !== null;
  const smoothStreamingText = useSmoothStreamingText(streamingText, isStreaming);
  const showThinking = isLoading && !isStreaming;
  const isNewChat = isDefaultConversationTitle(conversation?.title ?? 'New chat');
  const showHeroEmpty =
    messages.length === 0 && !showThinking && !isStreaming && isNewChat;

  useEffect(() => {
    setInput('');
    setAttachments([]);
    setError(null);
    setStatusMessage(null);
    setStreamingText(null);
    setIsLoading(false);
    cancelRecording();
  }, [conversation?.id, cancelRecording]);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }

  useEffect(() => {
    if (!isStreaming) return;
    scrollToEnd();
  }, [smoothStreamingText, isStreaming]);

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToEnd();
  }, [conversation?.id, messages.length]);

  async function handleAttach(action: 'photos-and-files' | 'camera') {
    try {
      let attachment: ChatAttachment | null = null;

      if (action === 'camera') {
        attachment = await takePhoto();
      } else {
        attachment = await pickPhotosAndFiles();
      }

      if (!attachment) return;

      if (attachment.kind === 'image' && !canAddImageAttachment(attachments)) {
        setError('You can attach up to 3 images per message.');
        return;
      }

      setAttachments((previous) => [...previous, attachment!]);
      setStatusMessage(null);
    } catch (attachError) {
      const message =
        attachError instanceof Error ? attachError.message : 'Could not attach that file.';
      setError(message);
    }
  }

  async function handleVoicePress() {
    if (!isSupported) {
      setError(
        Platform.OS === 'web'
          ? 'Voice input works in Chrome or Edge. Try opening the app in one of those browsers.'
          : 'Voice input is available in the web app for now.'
      );
      return;
    }

    if (isRecording) return;

    inputBeforeRecordingRef.current = input;
    setError(null);
    setStatusMessage(null);

    const started = await startRecording();
    if (started) return;

    setError('Could not start the microphone. Allow mic access in your browser settings.');
  }

  function handleVoiceCancel() {
    cancelRecording();
    setInput(inputBeforeRecordingRef.current);
    inputBeforeRecordingRef.current = '';
    setStatusMessage(null);
  }

  async function handleVoiceConfirm() {
    const spokenText = await confirmRecording();
    const base = inputBeforeRecordingRef.current.trim();

    if (spokenText) {
      setInput(base ? `${base} ${spokenText}` : spokenText);
      setStatusMessage('Voice added to your message');
    } else {
      setInput(base);
      setStatusMessage('No speech detected. Speak clearly, then tap the checkmark.');
    }

    inputBeforeRecordingRef.current = '';
    setError(null);
  }

  function handleRemoveAttachment(attachmentId: string) {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== attachmentId));
  }

  async function sendMessage(text: string, pendingAttachments: ChatAttachment[] = attachments) {
    if (!conversation) return;

    const trimmed = text.trim();
    if ((!trimmed && pendingAttachments.length === 0) || isLoading) return;

    const isFirstExchange = messages.length === 0;
    const messageAttachments = cloneAttachments(pendingAttachments);

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      text: trimmed,
      role: 'user',
      createdAt: Date.now(),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    };

    const nextMessages = [...messages, userMessage];

    setInput('');
    setAttachments([]);
    setError(null);
    setIsLoading(true);
    setStreamingText(null);
    cancelRecording();
    await onUpdateMessages(conversation.id, nextMessages);
    scrollToEnd();

    try {
      const reply = await streamChatMessage(nextMessages, (partialText) => {
        setStreamingText(partialText);
      });

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        text: reply,
        role: 'assistant',
        createdAt: Date.now(),
      };

      setStreamingText(null);
      await onUpdateMessages(conversation.id, [...nextMessages, assistantMessage]);

      if (isFirstExchange && onRenameConversation) {
        const title = await fetchConversationTitle(getMessagePreviewText(userMessage));
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
    void sendMessage(input, attachments);
  }

  const listData: ChatMessage[] = isStreaming
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

  listDataRef.current = listData;

  const scrollMarkers = useMemo(() => buildUserScrollMarkers(listData), [listData]);
  const scrollProgress = getScrollProgress(scrollMetrics);
  const isScrollable =
    scrollMetrics.viewportHeight > 0 &&
    scrollMetrics.contentHeight > scrollMetrics.viewportHeight + 20;
  const showScrollRail =
    Platform.OS === 'web' && scrollMarkers.length > 0 && isScrollable;
  const showJumpToBottom = shouldShowScrollToBottom(scrollMetrics);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 30 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const indices = viewableItems
        .map((item) => item.index)
        .filter((index): index is number => index !== null);

      setActiveMarkerId(getActiveUserMarkerId(listDataRef.current, indices));
    }
  ).current;

  const handleListLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const viewportHeight = event.nativeEvent.layout.height;

    setListViewportHeight(viewportHeight);
    setScrollMetrics((previous) => ({
      ...previous,
      viewportHeight,
    }));
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    setScrollMetrics({
      offsetY: contentOffset.y,
      contentHeight: contentSize.height,
      viewportHeight: layoutMeasurement.height,
    });
  }, []);

  const jumpToUserMessage = useCallback((listIndex: number) => {
    listRef.current?.scrollToIndex({ index: listIndex, animated: true, viewPosition: 0 });
  }, []);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index),
        animated: true,
      });
    },
    []
  );

  const userInitial = userEmail?.charAt(0).toUpperCase() ?? '?';

  const composerProps = {
    value: input,
    onChangeText: setInput,
    onSend: handleSend,
    onPickAttach: (action) => void handleAttach(action),
    onVoicePress: () => void handleVoicePress(),
    onVoiceCancel: handleVoiceCancel,
    onVoiceConfirm: () => void handleVoiceConfirm(),
    attachments,
    onRemoveAttachment: handleRemoveAttachment,
    isLoading,
    isRecording,
    recordingTranscript,
    audioLevels,
    showCameraOption: shouldShowCameraOption(),
  };

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
          {showHeroEmpty ? (
            <View style={styles.mainColumn}>
              <View style={styles.heroState}>
                <ThemedText
                  lightColor={ChatTheme.assistantText}
                  darkColor={ChatTheme.assistantTextDark}
                  style={styles.heroTitle}>
                  What&apos;s on your mind today?
                </ThemedText>

                <ChatComposer variant="hero" {...composerProps} />

                {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
                {storageWarning && !error ? (
                  <ThemedText style={styles.warningText}>{storageWarning}</ThemedText>
                ) : null}
                {statusMessage && !error ? (
                  <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
                ) : null}

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
            </View>
          ) : (
            <View style={styles.threadOuter}>
              <View style={styles.threadCenterColumn}>
                <View style={styles.threadWrapper}>
                  <View style={styles.threadBody}>
                    <View style={styles.threadArea}>
                      <FlatList
                        ref={listRef}
                        style={styles.messageScroll}
                        data={listData}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messageList}
                        onLayout={handleListLayout}
                        onContentSizeChange={(_width, contentHeight) => {
                          setScrollMetrics((previous) => ({
                            ...previous,
                            contentHeight,
                          }));
                        }}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        onScrollToIndexFailed={handleScrollToIndexFailed}
                        showsVerticalScrollIndicator={!showScrollRail}
                        nestedScrollEnabled
                        ListFooterComponent={<StreamingPlaceholder visible={showThinking} />}
                        renderItem={({ item }) => (
                          <ChatBubble
                            message={item}
                            isStreaming={item.id === 'streaming-assistant' && isStreaming}
                          />
                        )}
                      />

                      <ScrollToBottomButton visible={showJumpToBottom} onPress={scrollToEnd} />
                    </View>
                  </View>

                  {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
                  {storageWarning && !error ? (
                    <ThemedText style={styles.warningText}>{storageWarning}</ThemedText>
                  ) : null}
                  {statusMessage && !error ? (
                    <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
                  ) : null}

                  <View
                    style={[
                      styles.bottomComposerArea,
                      { backgroundColor: isDark ? ChatTheme.pageBgDark : ChatTheme.pageBg },
                    ]}>
                    <ChatComposer {...composerProps} />
                    <ThemedText style={styles.disclaimer}>
                      Soulmate AI can make mistakes. Consider checking important information.
                    </ThemedText>
                  </View>
                </View>
              </View>

              {showScrollRail ? (
                <View style={[styles.railDock, { height: listViewportHeight }]}>
                  <ChatScrollRail
                    markers={scrollMarkers}
                    activeMarkerId={activeMarkerId}
                    scrollProgress={scrollProgress}
                    height={listViewportHeight}
                    onMarkerPress={jumpToUserMessage}
                  />
                </View>
              ) : null}
            </View>
          )}
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
    minHeight: 0,
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
    minHeight: 0,
  },
  mainColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    minHeight: 0,
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
  threadOuter: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    position: 'relative',
  },
  threadCenterColumn: {
    flex: 1,
    width: '100%',
    paddingLeft: 28,
    paddingRight: ChatTheme.threadRailWidth + 16,
    minHeight: 0,
  },
  railDock: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: ChatTheme.threadRailWidth,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  threadWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  threadBody: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  threadArea: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    position: 'relative',
  },
  messageScroll: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? ({ overflow: 'scroll', overscrollBehavior: 'contain' } as const)
      : {}),
  },
  messageList: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 24,
    width: '100%',
  },
  errorText: {
    color: ChatTheme.error,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 14,
  },
  warningText: {
    color: '#B7791F',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  statusText: {
    color: ChatTheme.accent,
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
    flexShrink: 0,
    zIndex: 2,
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
