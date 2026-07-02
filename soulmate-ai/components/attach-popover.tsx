import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';

type AttachPopoverProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (action: 'photos-and-files' | 'camera') => void;
  showCamera?: boolean;
};

export function AttachPopover({
  visible,
  onClose,
  onPick,
  showCamera = true,
}: AttachPopoverProps) {
  if (!visible) return null;

  function handlePick(action: 'photos-and-files' | 'camera') {
    onClose();
    onPick(action);
  }

  return (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close attach menu" />

      <View style={styles.anchor} pointerEvents="box-none">
        <View style={styles.popover}>
          <Pressable
            style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
            onPress={() => handlePick('photos-and-files')}>
            <Ionicons name="attach-outline" size={18} color={ChatTheme.sidebarText} />
            <ThemedText style={styles.primaryLabel}>Add photos & files</ThemedText>
          </Pressable>

          {showCamera ? (
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={() => handlePick('camera')}>
              <View style={styles.menuIcon}>
                <Ionicons name="camera-outline" size={18} color={ChatTheme.sidebarText} />
              </View>
              <View style={styles.menuCopy}>
                <ThemedText style={styles.menuTitle}>Take photo</ThemedText>
                <ThemedText style={styles.menuDescription}>Use your camera</ThemedText>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close attach menu">
            <Ionicons name="chevron-down" size={16} color={ChatTheme.sidebarMuted} />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    top: -2000,
    bottom: -2000,
    left: -2000,
    right: -2000,
    zIndex: 18,
    ...(Platform.OS === 'web' ? ({ cursor: 'default' } as const) : {}),
  },
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: 10,
    zIndex: 19,
    alignItems: 'center',
  },
  popover: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: ChatTheme.pageBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ChatTheme.inputBorder,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    gap: 2,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.12)' } as const) : {}),
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: ChatTheme.sidebarText,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  menuIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: {
    flex: 1,
    gap: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: ChatTheme.sidebarText,
  },
  menuDescription: {
    fontSize: 12,
    color: ChatTheme.sidebarMuted,
  },
  dismissButton: {
    position: 'absolute',
    bottom: -14,
    alignSelf: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.pageBg,
    borderWidth: 1,
    borderColor: ChatTheme.inputBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressed: {
    opacity: 0.82,
  },
});
