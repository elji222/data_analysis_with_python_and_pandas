import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  View,
} from 'react-native';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { ArtifactPreviewPanel } from '@/components/artifact-preview-panel';
import { ChatPanel } from '@/components/chat-panel';
import { ConversationSidebar } from '@/components/conversation-sidebar';
import { InternetStatusBanner } from '@/components/internet-status-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatTheme } from '@/constants/chat-theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatIntent } from '@/contexts/chat-intent-context';
import { useShellLayout } from '@/hooks/use-mobile-chat-layout';
import { useConversations } from '@/hooks/use-conversations';
import type { PreviewArtifact } from '@/types/preview-artifact';

export default function ChatScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { consumeChatIntent } = useChatIntent();
  const shellLayout = useShellLayout();
  const isWideLayout = shellLayout === 'desktop';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState<PreviewArtifact | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const pendingIntentRef = useRef<{ prompt: string; newConversation?: boolean } | null>(null);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    isReady,
    storageWarning,
    selectConversation,
    startNewConversation,
    deleteConversation,
    updateConversationMessages,
    renameConversation,
  } = useConversations(user?.id);

  useFocusEffect(
    useCallback(() => {
      const intent = consumeChatIntent();
      if (intent) {
        pendingIntentRef.current = intent;
        setInitialPrompt(intent.prompt);
      }
    }, [consumeChatIntent])
  );

  useEffect(() => {
    const intent = pendingIntentRef.current;
    if (!isReady || !intent) return;

    pendingIntentRef.current = null;

    if (intent.newConversation) {
      void startNewConversation();
    }
  }, [isReady, startNewConversation]);

  useEffect(() => {
    setPreviewArtifact(null);
  }, [activeConversationId]);

  async function handleSelectConversation(conversationId: string) {
    await selectConversation(conversationId);
    setIsSidebarOpen(false);
  }

  async function handleNewConversation() {
    await startNewConversation();
    setIsSidebarOpen(false);
  }

  if (authLoading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color="#7B61FF" size="large" />
        <ThemedText style={styles.loadingText}>Checking sign in...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.loading}>
        <ThemedText style={styles.loadingText}>Please sign in to use chat.</ThemedText>
      </ThemedView>
    );
  }

  if (!isReady) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color="#7B61FF" size="large" />
        <ThemedText style={styles.loadingText}>Loading your conversations...</ThemedText>
      </ThemedView>
    );
  }

  if (!activeConversation) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color="#7B61FF" size="large" />
        <ThemedText style={styles.loadingText}>Starting a new chat...</ThemedText>
      </ThemedView>
    );
  }

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={deleteConversation}
      onClose={isWideLayout ? undefined : () => setIsSidebarOpen(false)}
      variant={isWideLayout ? 'desktop' : 'mobile'}
      userEmail={user.email}
    />
  );

  const chatPanelProps = {
    conversation: activeConversation,
    onUpdateMessages: updateConversationMessages,
    onRenameConversation: renameConversation,
    storageWarning,
    userEmail: user.email,
    initialPrompt,
    onInitialPromptConsumed: () => setInitialPrompt(null),
    activePreviewId: previewArtifact?.id ?? null,
    onOpenPreview: setPreviewArtifact,
  };

  return (
    <AppErrorBoundary title="Chat could not load">
      <ThemedView style={styles.container}>
        <InternetStatusBanner />
        {isWideLayout ? (
          <View style={styles.desktopLayout}>
            {sidebar}
            <View style={styles.chatMain}>
              <View style={styles.chatColumn}>
                <ChatPanel
                  key={activeConversationId}
                  {...chatPanelProps}
                />
              </View>
              <ArtifactPreviewPanel
                artifact={previewArtifact}
                visible={Boolean(previewArtifact)}
                variant="sidebar"
                onClose={() => setPreviewArtifact(null)}
              />
            </View>
          </View>
        ) : (
          <>
            <ChatPanel
              key={activeConversationId}
              {...chatPanelProps}
              onOpenSidebar={() => setIsSidebarOpen(true)}
              showSidebarToggle
            />

            <ArtifactPreviewPanel
              artifact={previewArtifact}
              visible={Boolean(previewArtifact)}
              variant="modal"
              onClose={() => setPreviewArtifact(null)}
            />

            <Modal
              visible={isSidebarOpen}
              animationType="slide"
              transparent={false}
              onRequestClose={() => setIsSidebarOpen(false)}>
              <ThemedView style={styles.mobileSidebar}>{sidebar}</ThemedView>
            </Modal>
          </>
        )}
      </ThemedView>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    opacity: 0.7,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  chatMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 0,
    minWidth: 0,
  },
  chatColumn: {
    flex: 1,
    minWidth: 0,
  },
  mobileSidebar: {
    flex: 1,
    width: '100%',
    backgroundColor: ChatTheme.sidebarBg,
  },
});
