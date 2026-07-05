import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getMessagePreviewText } from '@/lib/build-chat-api-messages';
import {
  createConversationTitle,
  isDefaultConversationTitle,
  shouldShortenConversationTitle,
} from '@/lib/conversation-title';
import { isStorageQuotaError } from '@/lib/strip-attachments-for-storage';
import {
  ConversationCloudError,
  loadSyncedConversations,
  persistSyncedActiveConversationId,
  persistSyncedConversation,
  persistSyncedConversations,
  refreshCloudConversations,
  removeSyncedConversation,
} from '@/services/conversation-cloud';
import {
  clearConversationsStorage,
  ConversationStorageError,
  createEmptyConversation,
} from '@/services/conversation-storage';
import type { ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

import { conversationSignature, sortConversations } from '@/lib/conversations/sync';

function normalizeStoredConversations(conversations: Conversation[]): Conversation[] {
  return conversations.map((conversation) => {
    const firstUserMessage = conversation.messages.find((message) => message.role === 'user');
    if (!firstUserMessage) return conversation;

    if (!shouldShortenConversationTitle(conversation.title, firstUserMessage.text)) {
      return conversation;
    }

    return {
      ...conversation,
      title: createConversationTitle(firstUserMessage.text),
    };
  });
}

function repairStoredConversations(conversations: Conversation[]): Conversation[] {
  const normalized = normalizeStoredConversations(conversations);
  const withMessages = normalized.filter((conversation) => conversation.messages.length > 0);
  const emptyNewChats = normalized.filter(
    (conversation) =>
      conversation.messages.length === 0 && isDefaultConversationTitle(conversation.title)
  );

  if (withMessages.length > 0) {
    return sortConversations([
      ...withMessages,
      ...(emptyNewChats.length > 0 ? [emptyNewChats[0]] : []),
    ]);
  }

  if (emptyNewChats.length > 0) {
    return [emptyNewChats[0]];
  }

  return [createEmptyConversation()];
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const signatureRef = useRef<string>('');

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const applyConversations = useCallback((nextConversations: Conversation[]) => {
    const sorted = sortConversations(nextConversations);
    conversationsRef.current = sorted;
    signatureRef.current = conversationSignature(sorted);
    setConversations(sorted);
  }, []);

  const hydrateFromSource = useCallback(
    async (showLoading = true) => {
      if (!userId) return;

      if (showLoading) {
        setIsReady(false);
      }

      try {
        const synced = await loadSyncedConversations(userId);
        let nextConversations = repairStoredConversations(synced.conversations);

        if (nextConversations.length === 0) {
          nextConversations = [createEmptyConversation()];
          await persistSyncedConversations(userId, nextConversations);
        } else if (conversationSignature(nextConversations) !== conversationSignature(synced.conversations)) {
          await persistSyncedConversations(userId, nextConversations);
        }

        const activeId =
          synced.activeConversationId &&
          nextConversations.some((conversation) => conversation.id === synced.activeConversationId)
            ? synced.activeConversationId
            : nextConversations[0].id;

        applyConversations(nextConversations);
        setActiveConversationId(activeId);
        await persistSyncedActiveConversationId(userId, activeId);

        if (synced.source === 'local') {
          setStorageWarning('Cloud sync is unavailable right now. Showing chats saved on this device.');
        } else {
          setStorageWarning(null);
        }
      } catch (error) {
        if (error instanceof ConversationCloudError) {
          setStorageWarning(error.message);
          applyConversations([createEmptyConversation()]);
          setActiveConversationId(conversationsRef.current[0]?.id ?? null);
        } else if (isStorageQuotaError(error) || error instanceof ConversationStorageError) {
          await clearConversationsStorage(userId);
          const freshConversation = createEmptyConversation();
          applyConversations([freshConversation]);
          setActiveConversationId(freshConversation.id);
          setStorageWarning(
            'Your browser storage was full, so old local chats were cleared. Cloud sync will keep new chats.'
          );
        } else {
          throw error;
        }
      } finally {
        setIsReady(true);
      }
    },
    [applyConversations, userId]
  );

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setActiveConversationId(null);
      setIsReady(false);
      conversationsRef.current = [];
      signatureRef.current = '';
      return;
    }

    void hydrateFromSource();
  }, [hydrateFromSource, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !isReady) return;

      let cancelled = false;

      void refreshCloudConversations(userId)
        .then((refreshed) => {
          if (cancelled) return;

          const repaired = repairStoredConversations(refreshed);
          if (conversationSignature(repaired) === signatureRef.current) return;

          const activeStillExists =
            activeConversationId &&
            repaired.some((conversation) => conversation.id === activeConversationId);

          applyConversations(repaired);
          if (!activeStillExists) {
            const nextActiveId = repaired[0]?.id ?? null;
            setActiveConversationId(nextActiveId);
            if (nextActiveId) {
              void persistSyncedActiveConversationId(userId, nextActiveId);
            }
          }
        })
        .catch(() => {
          // Keep the current session if a background refresh fails.
        });

      return () => {
        cancelled = true;
      };
    }, [activeConversationId, applyConversations, isReady, userId])
  );

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  const persistUpdater = useCallback(
    async (updater: (previous: Conversation[]) => Conversation[]) => {
      if (!userId) return;

      const nextConversations = sortConversations(updater(conversationsRef.current));
      applyConversations(nextConversations);

      try {
        await persistSyncedConversations(userId, nextConversations);
        setStorageWarning(null);
      } catch (error) {
        if (error instanceof ConversationCloudError) {
          setStorageWarning(
            'Could not sync chats to the cloud. Your messages are saved on this device for now.'
          );
          return;
        }

        if (error instanceof ConversationStorageError || isStorageQuotaError(error)) {
          setStorageWarning(
            error instanceof Error
              ? error.message
              : 'Could not save chat history on this device. Your messages will stay in this session.'
          );
          return;
        }

        throw error;
      }
    },
    [applyConversations, userId]
  );

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;
      setActiveConversationId(conversationId);

      try {
        await persistSyncedActiveConversationId(userId, conversationId);
      } catch {
        setStorageWarning('Could not sync your active chat selection to the cloud.');
      }
    },
    [userId]
  );

  const startNewConversation = useCallback(async () => {
    const conversation = createEmptyConversation();
    await persistUpdater((previous) => [conversation, ...previous]);
    await selectConversation(conversation.id);
    return conversation.id;
  }, [persistUpdater, selectConversation]);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;

      const remaining = conversationsRef.current.filter(
        (conversation) => conversation.id !== conversationId
      );

      if (remaining.length === 0) {
        const conversation = createEmptyConversation();
        await persistUpdater(() => [conversation]);
        await selectConversation(conversation.id);
        return;
      }

      applyConversations(remaining);

      try {
        await removeSyncedConversation(userId, conversationId, remaining);
        setStorageWarning(null);
      } catch (error) {
        if (error instanceof ConversationCloudError) {
          setStorageWarning('Could not delete that chat from the cloud. It was removed on this device.');
        } else {
          throw error;
        }
      }

      if (activeConversationId === conversationId) {
        await selectConversation(remaining[0].id);
      }
    },
    [activeConversationId, applyConversations, selectConversation, userId]
  );

  const updateConversationMessages = useCallback(
    async (conversationId: string, messages: ChatMessage[]) => {
      const now = Date.now();
      const firstUserMessage = messages.find((message) => message.role === 'user');

      const nextConversations = sortConversations(
        conversationsRef.current.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;

          const shouldRename =
            isDefaultConversationTitle(conversation.title) && firstUserMessage !== undefined;

          return {
            ...conversation,
            messages,
            title: shouldRename
              ? createConversationTitle(getMessagePreviewText(firstUserMessage))
              : conversation.title,
            updatedAt: now,
          };
        })
      );

      const updatedConversation =
        nextConversations.find((conversation) => conversation.id === conversationId) ?? null;

      applyConversations(nextConversations);

      if (!userId || !updatedConversation) return;

      try {
        await persistSyncedConversation(userId, updatedConversation, nextConversations);
        setStorageWarning(null);
      } catch (error) {
        if (error instanceof ConversationCloudError) {
          setStorageWarning(
            'Could not sync this chat to the cloud. It is still saved on this device.'
          );
          return;
        }

        if (error instanceof ConversationStorageError || isStorageQuotaError(error)) {
          setStorageWarning(
            error instanceof Error
              ? error.message
              : 'Could not save chat history on this device.'
          );
          return;
        }

        throw error;
      }
    },
    [applyConversations, userId]
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      await persistUpdater((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title: trimmedTitle, updatedAt: Date.now() }
            : conversation
        )
      );
    },
    [persistUpdater]
  );

  return {
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
    refreshConversations: hydrateFromSource,
  };
};
