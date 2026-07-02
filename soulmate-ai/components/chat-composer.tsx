import { Ionicons } from '@expo/vector-icons';
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

import { ComposerAttachments } from '@/components/composer-attachments';
import { VoiceWaveform } from '@/components/voice-waveform';
import { ChatTheme } from '@/constants/chat-theme';
import type { ChatAttachment } from '@/types/chat';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachPress: () => void;
  onVoicePress: () => void;
  onVoiceCancel?: () => void;
  onVoiceConfirm?: () => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (attachmentId: string) => void;
  isLoading?: boolean;
  isRecording?: boolean;
  audioLevels?: number[];
  variant?: 'hero' | 'bottom';
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
  onAttachPress,
  onVoicePress,
  onVoiceCancel,
  onVoiceConfirm,
  attachments,
  onRemoveAttachment,
  isLoading = false,
  isRecording = false,
  audioLevels = [],
  variant = 'bottom',
}: ChatComposerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isLoading && !isRecording;
  const isHero = variant === 'hero';
  const isSingleLine = !value.includes('\n');

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

  return (
    <View style={[styles.wrapper, isHero && styles.wrapperHero]}>
      <ComposerAttachments attachments={attachments} onRemove={onRemoveAttachment} />

      <View
        style={[
          styles.shell,
          isHero && styles.shellHero,
          isRecording && styles.shellRecording,
          {
            backgroundColor: isDark ? ChatTheme.inputBgDark : ChatTheme.inputBg,
            borderColor: isRecording
              ? ChatTheme.accent
              : isDark
                ? ChatTheme.inputBorderDark
                : ChatTheme.inputBorder,
          },
        ]}>
        <View style={styles.contentRow}>
          <Pressable
            style={({ pressed }) => [styles.iconSlot, pressed && styles.iconPressed]}
            disabled={isLoading || isRecording}
            onPress={onAttachPress}
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
              placeholder="Ask anything"
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
                onPress={onVoiceCancel}
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
                onPress={onVoiceConfirm}
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
                  size={20}
                  color={isDark ? ChatTheme.sidebarMutedDark : ChatTheme.sidebarMuted}
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                  pressed && canSend && styles.pressed,
                ]}
                onPress={onSend}
                disabled={!canSend}>
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
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
  shellHero: {
    minHeight: 58,
    borderRadius: 32,
    paddingVertical: 8,
  },
  shellRecording: {
    shadowColor: ChatTheme.accent,
    shadowOpacity: 0.14,
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
  iconPressed: {
    opacity: 0.7,
    backgroundColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    minHeight: SINGLE_LINE_HEIGHT,
    maxHeight: 160,
    fontSize: 16,
    lineHeight: 20,
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
  pressed: {
    opacity: 0.85,
  },
});
