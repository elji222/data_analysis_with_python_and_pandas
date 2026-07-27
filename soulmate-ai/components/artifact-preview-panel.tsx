import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { createElement, useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import { wrapHtmlDocument, wrapSvgDocument } from '@/lib/parse-artifacts';
import type { PreviewArtifact } from '@/types/preview-artifact';

type ArtifactPreviewPanelProps = {
  artifact: PreviewArtifact | null;
  visible: boolean;
  variant: 'sidebar' | 'modal';
  onClose: () => void;
};

function HtmlPreview({ html }: { html: string }) {
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.fallback}>
        <ThemedText style={styles.fallbackText}>
          Live HTML preview is available on web. Open this chat on desktop web to view it.
        </ThemedText>
      </View>
    );
  }

  return createElement('iframe', {
    srcDoc: html,
    title: 'Artifact preview',
    sandbox: 'allow-scripts allow-same-origin',
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      background: '#FFFFFF',
    },
  });
}

function PreviewBody({ artifact }: { artifact: PreviewArtifact }) {
  const htmlDocument = useMemo(() => {
    if (artifact.kind === 'svg') {
      return wrapSvgDocument(artifact.content);
    }

    if (artifact.kind === 'html') {
      return wrapHtmlDocument(artifact.content);
    }

    return null;
  }, [artifact]);

  if (artifact.kind === 'image') {
    return (
      <View style={styles.imagePreview}>
        <Image source={{ uri: artifact.content }} style={styles.previewImage} contentFit="contain" />
      </View>
    );
  }

  if (htmlDocument) {
    return (
      <View style={styles.previewFrame}>
        <HtmlPreview html={htmlDocument} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.codeScroll} showsVerticalScrollIndicator>
      <ThemedText style={styles.codeText}>{artifact.content}</ThemedText>
    </ScrollView>
  );
}

function PreviewChrome({
  artifact,
  onClose,
}: {
  artifact: PreviewArtifact;
  onClose: () => void;
}) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText style={styles.headerTitle}>{artifact.title}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {artifact.kind === 'code' ? artifact.language.toUpperCase() : 'Interactive preview'}
          </ThemedText>
        </View>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close preview">
          <Ionicons name="close" size={22} color={ChatTheme.sidebarText} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <PreviewBody artifact={artifact} />
      </View>
    </>
  );
}

export function ArtifactPreviewPanel({
  artifact,
  visible,
  variant,
  onClose,
}: ArtifactPreviewPanelProps) {
  if (!artifact) return null;

  if (variant === 'modal') {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <PreviewChrome artifact={artifact} onClose={onClose} />
          </View>
        </View>
      </Modal>
    );
  }

  if (!visible) return null;

  return (
    <View style={styles.sidebar}>
      <PreviewChrome artifact={artifact} onClose={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: '42%',
    minWidth: 360,
    maxWidth: 640,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: ChatTheme.sidebarBorder,
    backgroundColor: ChatTheme.pageBg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: ChatTheme.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ChatTheme.sidebarBorder,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: ChatTheme.sidebarMuted,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.sidebarHover,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  previewFrame: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
  },
  imagePreview: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  codeScroll: {
    padding: 16,
  },
  codeText: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 13,
    lineHeight: 20,
    color: ChatTheme.sidebarText,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackText: {
    textAlign: 'center',
    color: ChatTheme.sidebarMuted,
    lineHeight: 22,
  },
});
