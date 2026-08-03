import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ModelPickerAnchor } from '@/components/model-picker';
import { getChatModelById, type ChatModelId } from '@/constants/chat-models';
import { ChatTheme } from '@/constants/chat-theme';

type MobileChatHeaderProps = {
  onOpenSidebar: () => void;
  modelId?: ChatModelId;
  onOpenModelPicker?: (anchor: ModelPickerAnchor) => void;
};

export function MobileChatHeader({
  onOpenSidebar,
  modelId,
  onOpenModelPicker,
}: MobileChatHeaderProps) {
  const router = useRouter();
  const modelButtonRef = useRef<View>(null);
  const modelLabel = modelId ? getChatModelById(modelId).label : null;

  function handleOpenModelPicker() {
    if (!onOpenModelPicker) return;

    modelButtonRef.current?.measureInWindow((x, y, width, height) => {
      onOpenModelPicker({ x, y, width, height });
    });
  }

  return (
    <View style={styles.header} testID="mobile-chat-header">
      <Pressable style={styles.iconButton} onPress={onOpenSidebar} accessibilityLabel="Open menu">
        <Ionicons name="reorder-two" size={24} color={ChatTheme.sidebarText} />
      </Pressable>

      {modelLabel && onOpenModelPicker ? (
        <Pressable
          ref={modelButtonRef}
          style={({ pressed }) => [styles.titleButton, pressed && styles.titlePressed]}
          onPress={handleOpenModelPicker}
          accessibilityRole="button"
          accessibilityLabel="Change AI model">
          <ThemedText style={styles.title}>Soulmate AI</ThemedText>
          <View style={styles.modelRow}>
            <ThemedText style={styles.modelLabel}>{modelLabel}</ThemedText>
            <Ionicons name="chevron-down" size={13} color={ChatTheme.sidebarMuted} />
          </View>
        </Pressable>
      ) : (
        <ThemedText style={[styles.title, styles.titleCentered]}>Soulmate AI</ThemedText>
      )}

      <Pressable
        style={styles.iconButton}
        onPress={() => router.push('/memory')}
        accessibilityLabel="Open memory">
        <Ionicons name="bookmark-outline" size={22} color={ChatTheme.sidebarText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  titleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
    textAlign: 'center',
  },
  titleCentered: {
    flex: 1,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: -1,
  },
  modelLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: ChatTheme.sidebarMuted,
  },
});
