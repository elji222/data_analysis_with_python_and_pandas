import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, TextInput, View, useColorScheme } from 'react-native';

import { ChatTheme } from '@/constants/chat-theme';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  variant?: 'hero' | 'bottom';
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
            { color: isDark ? ChatTheme.assistantTextDark : ChatTheme.assistantText },
          ]}
          placeholder="Ask anything"
          placeholderTextColor={ChatTheme.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSend}
          returnKeyType="send"
          multiline
          editable={!isLoading}
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
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 28,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shellHero: {
    minHeight: 56,
    borderRadius: 32,
    paddingVertical: 10,
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
  },
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
