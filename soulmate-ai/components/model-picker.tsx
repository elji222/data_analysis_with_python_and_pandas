import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CHAT_MODELS, type ChatModelId, type ChatModelOption } from '@/constants/chat-models';
import { ChatTheme } from '@/constants/chat-theme';

export type ModelPickerAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ModelPickerProps = {
  visible: boolean;
  activeModelId: ChatModelId;
  anchor?: ModelPickerAnchor | null;
  onSelect: (modelId: ChatModelId) => void;
  onClose: () => void;
};

const MENU_WIDTH = 260;
const MENU_GAP = 8;
const ESTIMATED_MENU_HEIGHT = 280;

function ModelRow({
  model,
  isActive,
  onSelect,
}: {
  model: ChatModelOption;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      style={[styles.row, hovered && styles.rowHovered]}
      onPress={onSelect}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={
        model.shortBlurb ? `Use ${model.label}. ${model.shortBlurb}` : `Use ${model.label}`
      }
      accessibilityState={{ selected: isActive }}>
      <View style={styles.rowCopy}>
        <ThemedText style={styles.rowLabel}>{model.label}</ThemedText>
        {model.shortBlurb ? (
          <ThemedText style={styles.rowBlurb}>{model.shortBlurb}</ThemedText>
        ) : null}
      </View>
      {isActive ? (
        <Ionicons name="checkmark" size={18} color={ChatTheme.sidebarText} />
      ) : (
        <View style={styles.checkSpacer} />
      )}
    </Pressable>
  );
}

export function ModelPicker({
  visible,
  activeModelId,
  anchor = null,
  onSelect,
  onClose,
}: ModelPickerProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const menuLeft = (() => {
    if (!anchor) {
      return Math.max(12, (viewportWidth - MENU_WIDTH) / 2);
    }

    const centered = anchor.x + anchor.width / 2 - MENU_WIDTH / 2;
    return Math.min(Math.max(12, centered), viewportWidth - MENU_WIDTH - 12);
  })();

  const menuTop = (() => {
    if (!anchor) {
      return Math.max(72, viewportHeight * 0.12);
    }

    const below = anchor.y + anchor.height + MENU_GAP;
    const above = anchor.y - MENU_GAP - ESTIMATED_MENU_HEIGHT;
    const spaceBelow = viewportHeight - below;

    // Composer sits at the bottom — open upward like ChatGPT when needed.
    if (spaceBelow < ESTIMATED_MENU_HEIGHT && above >= 12) {
      return above;
    }

    return Math.min(below, viewportHeight - ESTIMATED_MENU_HEIGHT - 12);
  })();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close model menu"
        />

        <View
          style={[
            styles.menu,
            {
              top: menuTop,
              left: menuLeft,
              width: MENU_WIDTH,
            },
          ]}>
          <ThemedText style={styles.title}>Model</ThemedText>

          {CHAT_MODELS.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              isActive={model.id === activeModelId}
              onSelect={() => {
                onSelect(model.id);
                onClose();
              }}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ChatTheme.inputBorder,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    zIndex: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 28px rgba(0,0,0,0.14)' } as const)
      : {}),
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: ChatTheme.sidebarMuted,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {}),
  },
  rowHovered: {
    backgroundColor: ChatTheme.sidebarHover,
  },
  rowCopy: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  rowBlurb: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8E8E93',
  },
  checkSpacer: {
    width: 18,
    height: 18,
  },
});
