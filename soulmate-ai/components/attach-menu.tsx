import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';

type AttachMenuProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (action: 'library' | 'camera' | 'document') => void;
  showCamera?: boolean;
};

export function AttachMenu({
  visible,
  onClose,
  onPick,
  showCamera = true,
}: AttachMenuProps) {
  function handlePick(action: 'library' | 'camera' | 'document') {
    onClose();
    onPick(action);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <ThemedText style={styles.title}>Add to chat</ThemedText>

          <Pressable style={styles.option} onPress={() => handlePick('library')}>
            <Ionicons name="image-outline" size={20} color={ChatTheme.sidebarText} />
            <ThemedText style={styles.optionLabel}>Photo</ThemedText>
          </Pressable>

          {showCamera ? (
            <Pressable style={styles.option} onPress={() => handlePick('camera')}>
              <Ionicons name="camera-outline" size={20} color={ChatTheme.sidebarText} />
              <ThemedText style={styles.optionLabel}>Take photo</ThemedText>
            </Pressable>
          ) : null}

          <Pressable style={styles.option} onPress={() => handlePick('document')}>
            <Ionicons name="document-outline" size={20} color={ChatTheme.sidebarText} />
            <ThemedText style={styles.optionLabel}>Document</ThemedText>
          </Pressable>

          <Pressable style={[styles.option, styles.cancelOption]} onPress={onClose}>
            <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  sheet: {
    backgroundColor: ChatTheme.pageBg,
    borderRadius: 20,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: ChatTheme.inputBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: ChatTheme.sidebarText,
  },
  cancelOption: {
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelLabel: {
    fontSize: 16,
    color: ChatTheme.sidebarMuted,
    textAlign: 'center',
    width: '100%',
  },
});
