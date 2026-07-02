import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ChatTheme } from '@/constants/chat-theme';

type ScrollToBottomButtonProps = {
  visible: boolean;
  onPress: () => void;
};

export function ScrollToBottomButton({ visible, onPress }: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Scroll to latest message">
      <Ionicons name="arrow-down" size={18} color={ChatTheme.sidebarText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.pageBg,
    borderWidth: 1,
    borderColor: ChatTheme.inputBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } as const) : {}),
  },
  pressed: {
    opacity: 0.85,
  },
});
