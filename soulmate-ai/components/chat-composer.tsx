import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
  useColorScheme,
} from 'react-native';

import { AttachPopover } from '@/components/attach-popover';
import { ComposerAttachments } from '@/components/composer-attachments';
import { ThemedText } from '@/components/themed-text';
import { VoiceWaveform } from '@/components/voice-waveform';
import { ChatTheme } from '@/constants/chat-theme';
import type { ChatAttachment } from '@/types/chat';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickAttach: (action: 'photos-and-files' | 'camera') => void;
  onVoicePress: () => void;
  onVoiceCancel?: () => void;
  onVoiceConfirm?: () => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (attachmentId: string) => void;
  isLoading?: boolean;
  isRecording?: boolean;
  recordingTranscript?: string;
  audioLevels?: number[];
  showCameraOption?: boolean;
  variant?: 'hero' | 'bottom';
  layout?: 'default' | 'mobile';
};

type WebKeyDownEvent = {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
};

const ICON_SLOT = 40;
const SINGLE_LINE_HEIGHT = 24;

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onPickAttach,
  onVoicePress,
  onVoiceCancel,
  onVoiceConfirm,
  attachments,
  onRemoveAttachment,
  isLoading = false,
  isRecording = false,
  recordingTranscript = '',
  audioLevels = [],
  showCameraOption = false,
  variant = 'bottom',
  layout = 'default',
}: ChatComposerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const isMobileLayout = layout === 'mobile';
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isLoading && !isRecording;
  const isHero = variant === 'hero';
  const isSingleLine = !value.includes('\n');
  const hasAttachments = attachments.length > 0;

  function trySend() {
    if (canSend) {
      onSend();
    }
  }

  function handleKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (event.nativeEvent.key !== 'Enter') return;

    const shiftKey = (event.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean })
      .shiftKey;
    if (shiftKey) return;

    if (Platform.OS === 'web') {
      event.preventDefault?.();
    }

    trySend();
  }

  const webKeyDownProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: (event: WebKeyDownEvent) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              trySend();
            }
          },
        }
      : {};

  function handleAttachPress() {
    if (isLoading || isRecording) return;

    if (isMobileLayout) {
      onPickAttach('photos-and-files');
      return;
    }

    setIsAttachMenuOpen((open) => !open);
  }

  function handlePickAttach(action: 'photos-and-files' | 'camera') {
    setIsAttachMenuOpen(false);
    onPickAttach(action);
  }

  return (
    <View style={[styles.wrapper, isHero && styles.wrapperHero]}>
      <View style={styles.composerStack}>
        <AttachPopover
          visible={isAttachMenuOpen}
          onClose={() => setIsAttachMenuOpen(false)}
          onPick={handlePickAttach}
          showCamera={showCameraOption}
        />

        <View
          style={[
            styles.shell,
            isHero && styles.shellHero,
            hasAttachments && styles.shellWithAttachments,
            isRecording && styles.shellRecording,
            isMobileLayout && styles.shellMobile,
            {
              backgroundColor: isDark ? ChatTheme.inputBgDark : ChatTheme.inputBg,
              borderColor: isRecording
                ? ChatTheme.accent
                : isDark
                  ? ChatTheme.inputBorderDark
                  : ChatTheme.inputBorder,
            },
          ]}>
          {hasAttachments ? (
            <ComposerAttachments
              attachments={attachments}
              onRemove={onRemoveAttachment}
              variant="inside"
            />
          ) : null}

          <View style={styles.contentRow}>
            <Pressable
              style={({ pressed }) => [
                styles.iconSlot,
                isAttachMenuOpen && styles.iconSlotActive,
                pressed && styles.iconPressed,
              ]}
              disabled={isLoading || isRecording}
              onPress={handleAttachPress}
              accessibilityRole="button"
              accessibilityLabel="Attach file">
              <Ionicons
                name="add"
                size={22}
                color={isDark ? ChatTheme.sidebarMutedDark : ChatTheme.sidebarMuted}
              />
            </Pressable>

            {isRecording ? (
              <View style={styles.recordingCenter}>
                <VoiceWaveform levels={audioLevels} />
                {recordingTranscript ? (
                  <ThemedText numberOfLines={1} style={styles.recordingPreview}>
                    {recordingTranscript}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <TextInput
                style={[
                  styles.input,
                  isHero && styles.inputHero,
                  isSingleLine && styles.inputSingleLine,
                  Platform.OS === 'web' && styles.inputWeb,
                  Platform.OS === 'web' && isSingleLine && styles.inputWebSingleLine,
                  { color: isDark ? ChatTheme.assistantTextDark : ChatTheme.assistantText },
                ]}
                placeholder={isMobileLayout ? 'Ask Soulmate AI' : 'Ask anything'}
                placeholderTextColor={ChatTheme.inputPlaceholder}
                value={value}
                onChangeText={onChangeText}
                onKeyPress={handleKeyPress}
                returnKeyType="send"
                blurOnSubmit={false}
                submitBehavior="submit"
                multiline
                scrollEnabled={!isSingleLine}
                editable={!isLoading}
                underlineColorAndroid="transparent"
                selectionColor={ChatTheme.accent}
                {...webKeyDownProps}
              />
            )}

            {isRecording ? (
              <View style={styles.recordingActions}>
                <Pressable
                  style={({ pressed }) => [styles.iconSlot, pressed && styles.iconPressed]}
                  onPress={() => onVoiceCancel?.()}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel voice input">
                  <Ionicons
                    name="close"
                    size={22}
                    color={isDark ? ChatTheme.sidebarMutedDark : ChatTheme.sidebarMuted}
                  />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
                  onPress={() => onVoiceConfirm?.()}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm voice input">
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.trailingActions}>
                <Pressable
                  style={({ pressed }) => [styles.iconSlot, pressed && styles.iconPressed]}
                  disabled={isLoading}
                  onPress={onVoicePress}
                  accessibilityRole="button"
                  accessibilityLabel="Voice input">
                  <Ionicons
                    name="mic-outline"
                    size={22}
                    color={isDark ? ChatTheme.sidebarMutedDark : ChatTheme.sidebarMuted}
                  />
                </Pressable>
                {canSend ? (
                  <Pressable
                    style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
                    onPress={onSend}>
                    <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                  </Pressable>
                ) : isMobileLayout ? (
                  <Pressable
                    style={({ pressed }) => [styles.voiceModeButton, pressed && styles.pressed]}
                    disabled={isLoading}
                    onPress={onVoicePress}
                    accessibilityRole="button"
                    accessibilityLabel="Voice mode">
                    <Ionicons name="pulse" size={20} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.sendButton,
                      styles.sendButtonDisabled,
                      pressed && styles.pressed,
                    ]}
                    onPress={onSend}
                    disabled>
                    <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: ChatTheme.composerMaxWidth,
    alignSelf: 'center',
  },
  wrapperHero: {
    width: '100%',
  },
  composerStack: {
    position: 'relative',
    width: '100%',
  },
  shell: {
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 54,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shellWithAttachments: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  shellHero: {
    minHeight: 58,
    borderRadius: 32,
    paddingVertical: 8,
  },
  shellRecording: {
    shadowColor: ChatTheme.accent,
    shadowOpacity: 0.14,
  },
  shellMobile: {
    borderRadius: 999,
    minHeight: 56,
    paddingHorizontal: 10,
    shadowOpacity: 0.03,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  recordingCenter: {
    flex: 1,
    minHeight: SINGLE_LINE_HEIGHT,
    justifyContent: 'center',
    gap: 2,
  },
  recordingPreview: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.55,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  iconSlot: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer', zIndex: 2 } as const)
      : {}),
  },
  iconSlotActive: {
    backgroundColor: '#F0F0F0',
  },
  iconPressed: {
    opacity: 0.7,
    backgroundColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    minHeight: SINGLE_LINE_HEIGHT,
    maxHeight: 160,
    fontSize: ChatTheme.messageFontSize,
    lineHeight: ChatTheme.messageLineHeight,
    paddingHorizontal: 4,
    paddingVertical: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
  },
  inputSingleLine: {
    height: SINGLE_LINE_HEIGHT,
  },
  inputWeb: {
    outlineStyle: 'none',
    outlineWidth: 0,
    boxShadow: 'none',
    resize: 'none',
    overflow: 'hidden',
    paddingTop: 0,
    paddingBottom: 0,
  } as const,
  inputWebSingleLine: {
    height: SINGLE_LINE_HEIGHT,
    lineHeight: '20px',
  } as const,
  inputHero: {
    fontSize: 17,
  },
  trailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.sendButton,
  },
  confirmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.sendButton,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {}),
  },
  sendButtonDisabled: {
    backgroundColor: ChatTheme.sendButtonDisabled,
  },
  voiceModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.chatGptBlue,
  },
  pressed: {
    opacity: 0.85,
  },
});
