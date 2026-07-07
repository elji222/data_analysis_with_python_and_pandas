import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getMessagePreviewText } from '@/lib/build-chat-api-messages';
import {
  createConversationTitle,
  isDefaultConversationTitle,
} from '@/lib/conversation-title';
import { conversationSignature, repairStoredConversations, sortConversations } from '@/lib/conversations/sync';
import {
  clearCloudSyncRetry,
  scheduleCloudSyncRetry,
} from '@/lib/conversations/cloud-sync-retry';
import { isStorageQuotaError } from '@/lib/strip-attachments-for-storage';
import {
  ConversationCloudError,
  persistSyncedActiveConversationId,
  persistSyncedConversation,
  persistSyncedConversations,
  refreshCloudConversations,
  removeSyncedConversation,
  syncConversationsFromCloud,
} from '@/services/conversation-cloud';
import {
  clearConversationsStorage,
  ConversationStorageError,
  createEmptyConversation,
  loadActiveConversationId,
  loadConversations,
} from '@/services/conversation-storage';
import type { ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

function buildInitialConversations(
  conversations: Conversation[],
  preferredActiveConversationId?: string | null
) {
  let nextConversations = repairStoredConversations(
    conversations,
    preferredActiveConversationId,
    createEmptyConversation
  );

  if (nextConversations.length === 0) {
    nextConversations = [createEmptyConversation()];
  }

  const activeId =
    preferredActiveConversationId &&
    nextConversations.some((conversation) => conversation.id === preferredActiveConversationId)
      ? preferredActiveConversationId
      : nextConversations[0].id;

  return { nextConversations, activeId };
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const signatureRef = useRef<string>('');
  const activeConversationIdRef = useRef<string | null>(null);
  const shouldStartFreshChatRef = useRef(true);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const applyConversations = useCallback((nextConversations: Conversation[]) => {
    const sorted = sortConversations(nextConversations);
    conversationsRef.current = sorted;
    signatureRef.current = conversationSignature(sorted);
    setConversations(sorted);
  }, []);

  const pushLocalChatsToCloud = useCallback(async () => {
    if (!userId) return;

    await persistSyncedConversations(userId, conversationsRef.current);
    const activeId = activeConversationIdRef.current;
    if (activeId) {
      await persistSyncedActiveConversationId(userId, activeId);
    }
  }, [userId]);

  const queueCloudSyncRetry = useCallback(() => {
    if (!userId) return;
    scheduleCloudSyncRetry(userId, pushLocalChatsToCloud);
  }, [pushLocalChatsToCloud, userId]);

  const completeCloudSync = useCallback(() => {
    if (!userId) return;
    clearCloudSyncRetry(userId);
  }, [userId]);

  const applyCloudSyncResult = useCallback(
    (
      result: {
        conversations: Conversation[];
        activeConversationId: string | null;
        warning?: string | null;
      },
      options?: { preserveActiveId?: boolean }
    ) => {
      const repaired = repairStoredConversations(
        result.conversations,
        result.activeConversationId ?? activeConversationIdRef.current,
        createEmptyConversation
      );

      const preservedActiveId = options?.preserveActiveId
        ? activeConversationIdRef.current
        : null;

      if (conversationSignature(repaired) !== signatureRef.current) {
        applyConversations(repaired);

        if (preservedActiveId && repaired.some((conversation) => conversation.id === preservedActiveId)) {
          activeConversationIdRef.current = preservedActiveId;
          setActiveConversationId(preservedActiveId);
        } else {
          const activeId =
            result.activeConversationId &&
            repaired.some((conversation) => conversation.id === result.activeConversationId)
              ? result.activeConversationId
              : repaired[0]?.id ?? null;

          const nextActiveId =
            activeId ??
            (activeConversationIdRef.current &&
            repaired.some((conversation) => conversation.id === activeConversationIdRef.current)
              ? activeConversationIdRef.current
              : repaired[0]?.id ?? null);

          if (nextActiveId) {
            activeConversationIdRef.current = nextActiveId;
            setActiveConversationId(nextActiveId);
          }
        }
      } else if (
        !options?.preserveActiveId &&
        result.activeConversationId &&
        result.activeConversationId !== activeConversationIdRef.current &&
        conversationsRef.current.some((conversation) => conversation.id === result.activeConversationId)
      ) {
        activeConversationIdRef.current = result.activeConversationId;
        setActiveConversationId(result.activeConversationId);
      }

      if (result.warning && !result.warning.toLowerCase().includes('cloud sync')) {
        setStorageWarning(result.warning);
      }
    },
    [applyConversations]
  );

  const startNewConversation = useCallback(async () => {
    if (!userId) return null;

    const conversation = createEmptyConversation();
    const pruned = conversationsRef.current.filter((item) => item.messages.length > 0);
    const nextConversations = sortConversations([conversation, ...pruned]);

    activeConversationIdRef.current = conversation.id;
    setActiveConversationId(conversation.id);
    applyConversations(nextConversations);

    try {
      await persistSyncedConversations(userId, nextConversations);
      await persistSyncedActiveConversationId(userId, conversation.id);
      setStorageWarning(null);
      completeCloudSync();
    } catch (error) {
      if (error instanceof ConversationCloudError) {
        queueCloudSyncRetry();
        return conversation.id;
      }

      if (error instanceof ConversationStorageError || isStorageQuotaError(error)) {
        setStorageWarning(
          error instanceof Error
            ? error.message
            : 'Could not save chat history on this device. Your messages will stay in this session.'
        );
      } else {
        throw error;
      }
    }

    return conversation.id;
  }, [applyConversations, completeCloudSync, queueCloudSyncRetry, userId]);

  const startFreshConversationLocally = useCallback(() => {
    if (!userId) return null;

    const conversation = createEmptyConversation();
    const pruned = conversationsRef.current.filter((item) => item.messages.length > 0);
    const nextConversations = sortConversations([conversation, ...pruned]);

    activeConversationIdRef.current = conversation.id;
    setActiveConversationId(conversation.id);
    applyConversations(nextConversations);

    return conversation;
  }, [applyConversations, userId]);

  const hydrateFromSource = useCallback(
    async (showLoading = true, startFreshChat = false) => {
      if (!userId) return;

      if (showLoading) {
        setIsReady(false);
      }

      try {
        const [localConversations, localActiveId] = await Promise.all([
          loadConversations(userId),
          loadActiveConversationId(userId),
        ]);
        const { nextConversations, activeId } = buildInitialConversations(
          localConversations,
          localActiveId
        );

        applyConversations(nextConversations);
        activeConversationIdRef.current = activeId;
        setActiveConversationId(activeId);
      } catch (error) {
        if (isStorageQuotaError(error) || error instanceof ConversationStorageError) {
          await clearConversationsStorage(userId);
          const freshConversation = createEmptyConversation();
          applyConversations([freshConversation]);
          activeConversationIdRef.current = freshConversation.id;
          setActiveConversationId(freshConversation.id);
          setStorageWarning(
            'Your browser storage was full, so old local chats were cleared. Cloud sync will keep new chats.'
          );
        } else {
          const freshConversation = createEmptyConversation();
          applyConversations([freshConversation]);
          activeConversationIdRef.current = freshConversation.id;
          setActiveConversationId(freshConversation.id);
          setStorageWarning('Could not load chat history on this device.');
        }
      }

      if (startFreshChat) {
        startFreshConversationLocally();
      }

      setIsReady(true);

      void (async () => {
        try {
          const result = await syncConversationsFromCloud(userId);
          applyCloudSyncResult(result, { preserveActiveId: startFreshChat });
          completeCloudSync();
        } catch {
          queueCloudSyncRetry();
        }

        if (startFreshChat) {
          void startNewConversation();
        }
      })();
    },
    [
      applyCloudSyncResult,
      applyConversations,
      completeCloudSync,
      queueCloudSyncRetry,
      startFreshConversationLocally,
      startNewConversation,
      userId,
    ]
  );

  useEffect(() => {
    if (!userId) {
      shouldStartFreshChatRef.current = true;
      setConversations([]);
      setActiveConversationId(null);
      setIsReady(false);
      conversationsRef.current = [];
      signatureRef.current = '';
      return;
    }

    const startFreshChat = shouldStartFreshChatRef.current;
    shouldStartFreshChatRef.current = false;
    void hydrateFromSource(true, startFreshChat);

    return () => {
      clearCloudSyncRetry(userId);
    };
  }, [hydrateFromSource, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !isReady) return;

      let cancelled = false;

      void refreshCloudConversations(userId)
        .then((refreshed) => {
          if (cancelled) return;

          const activeId = activeConversationIdRef.current;
          const repaired = repairStoredConversations(refreshed, activeId, createEmptyConversation);
          if (conversationSignature(repaired) === signatureRef.current) return;

          const activeStillExists =
            activeId && repaired.some((conversation) => conversation.id === activeId);

          applyConversations(repaired);
          if (!activeStillExists) {
            const nextActiveId = repaired[0]?.id ?? null;
            setActiveConversationId(nextActiveId);
            if (nextActiveId) {
              void persistSyncedActiveConversationId(userId, nextActiveId);
            }
          }
          completeCloudSync();
        })
        .catch(() => {
          queueCloudSyncRetry();
        });

      return () => {
        cancelled = true;
      };
    }, [applyConversations, completeCloudSync, isReady, queueCloudSyncRetry, userId])
  );

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ??
    conversations[0] ??
    null;

  const persistUpdater = useCallback(
    async (updater: (previous: Conversation[]) => Conversation[]) => {
      if (!userId) return;

      const nextConversations = sortConversations(updater(conversationsRef.current));
      applyConversations(nextConversations);

      try {
        await persistSyncedConversations(userId, nextConversations);
        setStorageWarning(null);
        completeCloudSync();
      } catch (error) {
        if (error instanceof ConversationCloudError) {
          queueCloudSyncRetry();
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
    [applyConversations, completeCloudSync, queueCloudSyncRetry, userId]
  );

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;

      activeConversationIdRef.current = conversationId;
      setActiveConversationId(conversationId);

      try {
        await persistSyncedActiveConversationId(userId, conversationId);
        completeCloudSync();
      } catch {
        queueCloudSyncRetry();
      }
    },
    [completeCloudSync, queueCloudSyncRetry, userId]
  );

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
        completeCloudSync();
      } catch (error) {
        if (error instanceof ConversationCloudError) {
          queueCloudSyncRetry();
          return;
        }

        throw error;
      }

      if (activeConversationId === conversationId) {
        await selectConversation(remaining[0].id);
      }
    },
    [activeConversationId, applyConversations, completeCloudSync, queueCloudSyncRetry, selectConversation, userId]
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
        completeCloudSync();
      } catch (error) {
        if (error instanceof ConversationCloudError) {
          queueCloudSyncRetry();
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
    [applyConversations, completeCloudSync, queueCloudSyncRetry, userId]
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
