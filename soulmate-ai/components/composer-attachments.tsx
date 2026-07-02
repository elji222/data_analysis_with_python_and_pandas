import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import type { ChatAttachment } from '@/types/chat';

type ComposerAttachmentsProps = {
  attachments: ChatAttachment[];
  onRemove: (attachmentId: string) => void;
  variant?: 'inside' | 'outside';
};

export function ComposerAttachments({
  attachments,
  onRemove,
  variant = 'inside',
}: ComposerAttachmentsProps) {
  if (attachments.length === 0) return null;

  const isInside = variant === 'inside';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, isInside && styles.rowInside]}
      style={isInside ? styles.scrollInside : undefined}>
      {attachments.map((attachment) =>
        attachment.kind === 'image' ? (
          <View key={attachment.id} style={[styles.imageCard, isInside && styles.imageCardInside]}>
            <Image
              source={{ uri: attachment.uri }}
              style={[styles.thumbnail, isInside && styles.thumbnailInside]}
              contentFit="cover"
            />
            <Pressable
              style={styles.removeBadge}
              onPress={() => onRemove(attachment.id)}
              accessibilityLabel={`Remove ${attachment.name}`}>
              <Ionicons name="close" size={12} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View key={attachment.id} style={[styles.fileChip, isInside && styles.fileChipInside]}>
            <View style={styles.fileIcon}>
              <Ionicons name="document-outline" size={18} color={ChatTheme.sidebarMuted} />
            </View>
            <ThemedText numberOfLines={1} style={styles.fileName}>
              {attachment.name}
            </ThemedText>
            <Pressable style={styles.fileRemove} onPress={() => onRemove(attachment.id)}>
              <Ionicons name="close" size={14} color={ChatTheme.sidebarMuted} />
            </Pressable>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingBottom: 8,
  },
  rowInside: {
    paddingBottom: 0,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  scrollInside: {
    maxHeight: 72,
  },
  imageCard: {
    position: 'relative',
  },
  imageCardInside: {
    marginRight: 2,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  thumbnailInside: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ChatTheme.inputBorder,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 2,
    borderColor: ChatTheme.pageBg,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 220,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ChatTheme.inputBorder,
    backgroundColor: ChatTheme.pageBg,
  },
  fileChipInside: {
    maxWidth: 180,
    backgroundColor: '#F7F7F7',
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: ChatTheme.sidebarText,
  },
  fileRemove: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
});
