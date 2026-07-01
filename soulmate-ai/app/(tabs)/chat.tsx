import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChatPanel } from '@/components/chat-panel';
import { ConversationSidebar } from '@/components/conversation-sidebar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { useConversations } from '@/hooks/use-conversations';

const SIDEBAR_BREAKPOINT = 768;

export default function ChatScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isWideLayout = Platform.OS === 'web' && width >= SIDEBAR_BREAKPOINT;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    isReady,
    selectConversation,
    startNewConversation,
    deleteConversation,
    updateConversationMessages,
  } = useConversations(user?.id);

  async function handleSelectConversation(conversationId: string) {
    await selectConversation(conversationId);
    setIsSidebarOpen(false);
  }

  async function handleNewConversation() {
    await startNewConversation();
    setIsSidebarOpen(false);
  }

  if (!isReady) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color="#7B61FF" size="large" />
        <ThemedText style={styles.loadingText}>Loading your conversations...</ThemedText>
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
    />
  );

  return (
    <ThemedView style={styles.container}>
      {isWideLayout ? (
        <View style={styles.desktopLayout}>
          {sidebar}
          <ChatPanel
            conversation={activeConversation}
            onUpdateMessages={updateConversationMessages}
          />
        </View>
      ) : (
        <>
          <ChatPanel
            conversation={activeConversation}
            onUpdateMessages={updateConversationMessages}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            showSidebarToggle
          />

          <Modal
            visible={isSidebarOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setIsSidebarOpen(false)}>
            <View style={styles.modalRoot}>
              <Pressable style={styles.modalBackdrop} onPress={() => setIsSidebarOpen(false)} />
              <ThemedView style={styles.mobileSidebar}>{sidebar}</ThemedView>
            </View>
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
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  mobileSidebar: {
    width: '82%',
    maxWidth: 320,
  },
});
