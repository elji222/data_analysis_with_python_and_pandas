import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import type { ChatAttachment } from '@/types/chat';

type ComposerAttachmentsProps = {
  attachments: ChatAttachment[];
  onRemove: (attachmentId: string) => void;
};

export function ComposerAttachments({ attachments, onRemove }: ComposerAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {attachments.map((attachment) => (
        <View key={attachment.id} style={styles.chip}>
          {attachment.kind === 'image' ? (
            <Image source={{ uri: attachment.uri }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={styles.fileIcon}>
              <Ionicons name="document-outline" size={18} color={ChatTheme.sidebarMuted} />
            </View>
          )}
          <ThemedText numberOfLines={1} style={styles.name}>
            {attachment.name}
          </ThemedText>
          <Pressable style={styles.removeButton} onPress={() => onRemove(attachment.id)}>
            <Ionicons name="close" size={14} color={ChatTheme.sidebarMuted} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
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
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
  },
  name: {
    flex: 1,
    fontSize: 13,
    color: ChatTheme.sidebarText,
  },
  removeButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
});
