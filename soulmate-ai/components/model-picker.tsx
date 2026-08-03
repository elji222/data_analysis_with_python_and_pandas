import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CHAT_MODELS, type ChatModelId } from '@/constants/chat-models';
import { ChatTheme } from '@/constants/chat-theme';

type ModelPickerProps = {
  visible: boolean;
  activeModelId: ChatModelId;
  onSelect: (modelId: ChatModelId) => void;
  onClose: () => void;
};

export function ModelPicker({ visible, activeModelId, onSelect, onClose }: ModelPickerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.grabber} />
          <ThemedText style={styles.title}>Choose a model</ThemedText>

          {CHAT_MODELS.map((model) => {
            const isActive = model.id === activeModelId;

            return (
              <Pressable
                key={model.id}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => {
                  onSelect(model.id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Use ${model.label}`}>
                <View style={styles.rowText}>
                  <ThemedText style={styles.rowLabel}>{model.label}</ThemedText>
                  <ThemedText style={styles.rowTagline}>
                    {model.maker} - {model.tagline}
                  </ThemedText>
                </View>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={22} color={ChatTheme.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: ChatTheme.sidebarMuted,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  rowTagline: {
    fontSize: 13,
    color: ChatTheme.sidebarMuted,
  },
});
