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

import { ChatTheme } from '@/constants/chat-theme';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  variant?: 'hero' | 'bottom';
};

type WebKeyDownEvent = {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
};

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  isLoading = false,
  variant = 'bottom',
}: ChatComposerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const canSend = value.trim().length > 0 && !isLoading;
  const isHero = variant === 'hero';

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
      <View
        style={[
          styles.shell,
          isHero && styles.shellHero,
          {
            backgroundColor: isDark ? ChatTheme.inputBgDark : ChatTheme.inputBg,
            borderColor: isDark ? ChatTheme.inputBorderDark : ChatTheme.inputBorder,
          },
        ]}>
        <Pressable style={styles.attachButton} disabled={isLoading}>
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
            Platform.OS === 'web' && styles.inputWeb,
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
          editable={!isLoading}
          underlineColorAndroid="transparent"
          selectionColor={ChatTheme.accent}
          {...webKeyDownProps}
        />

        <View style={styles.trailingActions}>
          <Pressable style={styles.micButton} disabled={isLoading}>
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
    paddingHorizontal: 4,
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 28,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 10,
    gap: 4,
    minHeight: 52,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shellHero: {
    minHeight: 56,
    borderRadius: 32,
    paddingVertical: 12,
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  input: {
    flex: 1,
    minHeight: 28,
    maxHeight: 160,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  inputWeb: {
    outlineStyle: 'none',
    outlineWidth: 0,
    boxShadow: 'none',
    resize: 'none',
  } as const,
  inputHero: {
    fontSize: 17,
    minHeight: 32,
  },
  trailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  micButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
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
