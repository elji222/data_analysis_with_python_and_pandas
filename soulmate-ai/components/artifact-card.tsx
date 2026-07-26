import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import type { PreviewArtifact } from '@/types/preview-artifact';

type ArtifactCardProps = {
  artifact: PreviewArtifact;
  isActive?: boolean;
  onPress: () => void;
};

function getIconName(kind: PreviewArtifact['kind']) {
  if (kind === 'html') return 'globe-outline' as const;
  if (kind === 'svg') return 'image-outline' as const;
  return 'code-slash-outline' as const;
}

export function ArtifactCard({ artifact, isActive = false, onPress }: ArtifactCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${artifact.title}`}>
      <View style={styles.iconWrap}>
        <Ionicons name={getIconName(artifact.kind)} size={18} color={ChatTheme.accent} />
      </View>
      <View style={styles.textWrap}>
        <ThemedText style={styles.title}>{artifact.title}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {artifact.kind === 'code' ? artifact.language.toUpperCase() : 'Open side preview'}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={ChatTheme.sidebarMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: ChatTheme.sidebarBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ChatTheme.sidebarHover,
  },
  cardActive: {
    borderColor: ChatTheme.accent,
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  subtitle: {
    fontSize: 13,
    color: ChatTheme.sidebarMuted,
  },
});
