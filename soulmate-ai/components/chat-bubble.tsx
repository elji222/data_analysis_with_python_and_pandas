import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FormattedMessageText } from '@/components/formatted-message-text';
import { ArtifactCard } from '@/components/artifact-card';
import { CouncilAnswersPanel } from '@/components/council-answers-panel';
import { ShimmerText } from '@/components/shimmer-text';
import { StreamingCursor } from '@/components/streaming-cursor';
import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { parseArtifacts, stripArtifactBlocks } from '@/lib/parse-artifacts';
import type { ChatMessage } from '@/types/chat';
import type { PreviewArtifact } from '@/types/preview-artifact';

type ChatBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
  activePreviewId?: string | null;
  onOpenPreview?: (artifact: PreviewArtifact) => void;
  layout?: 'default' | 'mobile';
};

export function ChatBubble({
  message,
  isStreaming = false,
  activePreviewId = null,
  onOpenPreview,
  layout = 'default',
}: ChatBubbleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const isUser = message.role === 'user';
  const isMobileLayout = layout === 'mobile';
  const attachments = message.attachments ?? [];

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View
          style={[
            styles.userBubble,
            isMobileLayout && styles.userBubbleMobile,
            { backgroundColor: isDark ? ChatTheme.userBubbleDark : ChatTheme.userBubble },
          ]}>
          {attachments.length > 0 ? (
            <View style={styles.attachmentStack}>
              {attachments.map((attachment) =>
                attachment.kind === 'image' ? (
                  attachment.uri ? (
                    <Image
                      key={attachment.id}
                      source={{ uri: attachment.uri }}
                      style={styles.messageImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View key={attachment.id} style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={20} color={ChatTheme.sidebarMuted} />
                      <ThemedText numberOfLines={1} style={styles.fileName}>
                        {attachment.name}
                      </ThemedText>
                    </View>
                  )
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

  const artifacts = !isUser
    ? parseArtifacts(message.text).map((artifact, index) => ({
        ...artifact,
        id: `${message.id}-artifact-${index}`,
      }))
    : [];
  const visibleText = artifacts.length > 0 ? stripArtifactBlocks(message.text) : message.text;
  const imageAttachments = attachments.filter((attachment) => attachment.kind === 'image' && attachment.uri);

  function openImagePreview(url: string, title: string) {
    onOpenPreview?.({
      id: `${message.id}-image-preview`,
      kind: 'image',
      title,
      language: 'image',
      content: url,
    });
  }

  return (
    <View style={styles.assistantRow}>
      {imageAttachments.length > 0 ? (
        <View style={styles.attachmentStack}>
          {imageAttachments.map((attachment) => (
            <Pressable
              key={attachment.id}
              onPress={() => openImagePreview(attachment.uri, attachment.name || 'Generated image')}>
              <Image
                source={{ uri: attachment.uri }}
                style={styles.generatedImage}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {visibleText ? (
        <FormattedMessageText
          lightColor={ChatTheme.assistantText}
          darkColor={ChatTheme.assistantTextDark}
          style={styles.messageText}
          text={visibleText}
          suffix={isStreaming ? <StreamingCursor /> : undefined}
        />
      ) : isStreaming ? (
        <StreamingCursor />
      ) : null}

      {artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          isActive={activePreviewId === artifact.id}
          onPress={() => onOpenPreview?.(artifact)}
        />
      ))}

      {message.councilReview ? <CouncilAnswersPanel review={message.councilReview} /> : null}
    </View>
  );
}

type StreamingPlaceholderProps = {
  visible: boolean;
};

function ThinkingDot({ delayMs }: { delayMs: number }) {
  const offsetY = useSharedValue(0);
  const bounceDurationMs = 360;

  useEffect(() => {
    offsetY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: bounceDurationMs }),
          withTiming(0, { duration: bounceDurationMs })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(offsetY);
    };
  }, [delayMs, offsetY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function StreamingPlaceholder({ visible }: StreamingPlaceholderProps) {
  if (!visible) return null;

  return (
    <View style={styles.assistantRow}>
      <View style={styles.dots}>
        <ThinkingDot delayMs={0} />
        <ThinkingDot delayMs={180} />
        <ThinkingDot delayMs={360} />
      </View>
    </View>
  );
}

type SearchingPlaceholderProps = {
  visible: boolean;
};

const SEARCHING_TEXT = 'Searching the web';

export function SearchingPlaceholder({ visible }: SearchingPlaceholderProps) {
  if (!visible) return null;

  return (
    <View style={styles.assistantRow}>
      <View style={styles.searchingRow}>
        <ShimmerText style={styles.searchingText}>{SEARCHING_TEXT}</ShimmerText>
      </View>
    </View>
  );
}

const GENERATING_IMAGE_TEXT = 'Generating image';

export function GeneratingImagePlaceholder({ visible }: SearchingPlaceholderProps) {
  if (!visible) return null;

  return (
    <View style={styles.assistantRow}>
      <View style={styles.searchingRow}>
        <ShimmerText style={styles.searchingText}>{GENERATING_IMAGE_TEXT}</ShimmerText>
      </View>
    </View>
  );
}

type CouncilPlaceholderProps = {
  visible: boolean;
  stage?: 'answers' | 'ranking';
};

export function CouncilPlaceholder({ visible, stage = 'answers' }: CouncilPlaceholderProps) {
  if (!visible) return null;

  const text =
    stage === 'ranking'
      ? 'The council is ranking the answers'
      : 'Asking Claude, ChatGPT and Gemini';

  return (
    <View style={styles.assistantRow}>
      <View style={styles.searchingRow}>
        <ShimmerText style={styles.searchingText}>{text}</ShimmerText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  userBubbleMobile: {
    maxWidth: '92%',
    paddingHorizontal: 14,
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
  generatedImage: {
    width: 280,
    height: 280,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: 220,
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
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
  },
  messageText: {
    fontSize: ChatTheme.messageFontSize,
    lineHeight: ChatTheme.messageLineHeight,
  },
  messageTextWithAttachment: {
    marginTop: 4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: ChatTheme.sidebarMuted,
    opacity: 0.7,
  },
  searchingRow: {
    paddingVertical: 8,
  },
  searchingText: {
    fontWeight: '400',
  },
});
