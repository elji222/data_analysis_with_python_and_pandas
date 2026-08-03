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
const ESTIMATED_MENU_HEIGHT = 230;

function CouncilTooltip({ text }: { text: string }) {
  return (
    <View style={styles.tooltip} pointerEvents="none">
      <ThemedText style={styles.tooltipText}>{text}</ThemedText>
    </View>
  );
}

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
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const showTooltip =
    model.id === 'council' && (Platform.OS === 'web' ? hovered : tooltipVisible);

  return (
    <View style={styles.rowWrap}>
      <Pressable
        style={[styles.row, hovered && styles.rowHovered]}
        onPress={onSelect}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onLongPress={
          model.id === 'council' && Platform.OS !== 'web'
            ? () => setTooltipVisible(true)
            : undefined
        }
        delayLongPress={350}
        onPressOut={() => {
          if (Platform.OS !== 'web') setTooltipVisible(false);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          model.id === 'council' ? `Use Council. ${model.tagline}` : `Use ${model.label}`
        }
        accessibilityState={{ selected: isActive }}>
        <ThemedText style={styles.rowLabel}>{model.label}</ThemedText>
        {isActive ? (
          <Ionicons name="checkmark" size={18} color={ChatTheme.sidebarText} />
        ) : (
          <View style={styles.checkSpacer} />
        )}
      </Pressable>
      {showTooltip ? <CouncilTooltip text={model.tagline} /> : null}
    </View>
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
    overflow: 'visible',
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
  rowWrap: {
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
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
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: ChatTheme.sidebarText,
  },
  checkSpacer: {
    width: 18,
    height: 18,
  },
  tooltip: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '100%',
    marginTop: 6,
    width: undefined,
    backgroundColor: '#2F2F2F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 20,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 20px rgba(0,0,0,0.18)' } as const)
      : {}),
  },
  tooltipText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#F5F5F5',
  },
});
