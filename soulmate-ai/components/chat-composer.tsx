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
import { ChatTheme } from '@/constants/chat-theme';
import type { ChatAttachment } from '@/types/chat';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachPress: () => void;
  onVoicePress: () => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (attachmentId: string) => void;
  isLoading?: boolean;
  isListening?: boolean;
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
  attachments,
  onRemoveAttachment,
  isLoading = false,
  isListening = false,
  variant = 'bottom',
}: ChatComposerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isLoading;
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
          isListening && styles.shellListening,
          {
            backgroundColor: isDark ? ChatTheme.inputBgDark : ChatTheme.inputBg,
            borderColor: isListening
              ? ChatTheme.accent
              : isDark
                ? ChatTheme.inputBorderDark
                : ChatTheme.inputBorder,
          },
        ]}>
        <View style={styles.contentRow}>
          <Pressable
            style={({ pressed }) => [styles.iconSlot, pressed && styles.iconPressed]}
            disabled={isLoading}
            onPress={onAttachPress}
            accessibilityRole="button"
            accessibilityLabel="Attach file">
            <Ionicons
              name="add"
              size={22}
              color={isDark ? ChatTheme.sidebarMutedDark : ChatTheme.sidebarMuted}
            />
          </Pressable>

          <TextInput
            style={[
              styles.input,
              isHero && styles.inputHero,
              isSingleLine && styles.inputSingleLine,
              Platform.OS === 'web' && styles.inputWeb,
              Platform.OS === 'web' && isSingleLine && styles.inputWebSingleLine,
              { color: isDark ? ChatTheme.assistantTextDark : ChatTheme.assistantText },
            ]}
            placeholder={isListening ? 'Listening...' : 'Ask anything'}
            placeholderTextColor={ChatTheme.inputPlaceholder}
            value={value}
            onChangeText={onChangeText}
            onKeyPress={handleKeyPress}
            returnKeyType="send"
            blurOnSubmit={false}
            submitBehavior="submit"
            multiline
            scrollEnabled={!isSingleLine}
            editable={!isLoading && !isListening}
            underlineColorAndroid="transparent"
            selectionColor={ChatTheme.accent}
            {...webKeyDownProps}
          />

          <View style={styles.trailingActions}>
            <Pressable
              style={({ pressed }) => [
                styles.iconSlot,
                isListening && styles.iconSlotActive,
                pressed && styles.iconPressed,
              ]}
              disabled={isLoading}
              onPress={onVoicePress}
              accessibilityRole="button"
              accessibilityLabel="Voice input">
              <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={20}
                color={isListening ? ChatTheme.accent : isDark ? ChatTheme.sidebarMutedDark : ChatTheme.sidebarMuted}
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
  shellListening: {
    shadowColor: ChatTheme.accent,
    shadowOpacity: 0.18,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
    backgroundColor: '#F3EEFF',
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
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.sendButton,
  },
  sendButtonDisabled: {
    backgroundColor: ChatTheme.sendButtonDisabled,
  },
  pressed: {
    opacity: 0.85,
  },
});
