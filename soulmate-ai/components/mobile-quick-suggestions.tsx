import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MOBILE_QUICK_ACTIONS, ChatTheme } from '@/constants/chat-theme';

type MobileQuickSuggestionsProps = {
  onSelect: (prompt: string) => void;
};

export function MobileQuickSuggestions({ onSelect }: MobileQuickSuggestionsProps) {
  return (
    <View style={styles.container}>
      {MOBILE_QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.label}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => onSelect(action.prompt)}>
          <Ionicons name={action.icon} size={18} color={ChatTheme.sidebarMuted} />
          <ThemedText style={styles.label}>{action.label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    color: ChatTheme.sidebarText,
  },
  pressed: {
    opacity: 0.65,
  },
});
