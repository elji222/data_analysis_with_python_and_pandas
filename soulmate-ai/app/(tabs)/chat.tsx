import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  View,
} from 'react-native';

import { ChatPanel } from '@/components/chat-panel';
import { ConversationSidebar } from '@/components/conversation-sidebar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatTheme } from '@/constants/chat-theme';
import { useAuth } from '@/contexts/auth-context';
import { useShellLayout } from '@/hooks/use-mobile-chat-layout';
import { useConversations } from '@/hooks/use-conversations';

export default function ChatScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const shellLayout = useShellLayout();
  const isWideLayout = shellLayout === 'desktop';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  return (
    <ThemedView style={styles.container}>
      {isWideLayout ? (
        <View style={styles.desktopLayout}>
          {sidebar}
          <View style={styles.chatMain}>
            <ChatPanel
              key={activeConversationId}
              conversation={activeConversation}
              onUpdateMessages={updateConversationMessages}
              onRenameConversation={renameConversation}
              storageWarning={storageWarning}
              userEmail={user.email}
            />
          </View>
        </View>
      ) : (
        <>
          <ChatPanel
            key={activeConversationId}
            conversation={activeConversation}
            onUpdateMessages={updateConversationMessages}
            onRenameConversation={renameConversation}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onNewConversation={handleNewConversation}
            showSidebarToggle
            storageWarning={storageWarning}
            userEmail={user.email}
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
    alignItems: 'stretch',
    minHeight: 0,
    minWidth: 0,
  },
  mobileSidebar: {
    flex: 1,
    width: '100%',
    backgroundColor: ChatTheme.sidebarBg,
  },
});
