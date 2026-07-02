import { useCallback, useEffect, useRef, useState } from 'react';

import { getMessagePreviewText } from '@/lib/build-chat-api-messages';
import { createConversationTitle, isDefaultConversationTitle, shouldShortenConversationTitle } from '@/lib/conversation-title';
import {
  ConversationStorageError,
  createEmptyConversation,
  loadActiveConversationId,
  loadConversations,
  saveActiveConversationId,
  saveConversations,
} from '@/services/conversation-storage';
import type { ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

function sortConversations(items: Conversation[]): Conversation[] {
  return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
}

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

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setActiveConversationId(null);
      setIsReady(false);
      conversationsRef.current = [];
      return;
    }

    let isMounted = true;

    async function hydrate() {
      const [storedConversations, storedActiveId] = await Promise.all([
        loadConversations(userId!),
        loadActiveConversationId(userId!),
      ]);

      if (!isMounted) return;

      if (storedConversations.length === 0) {
        const firstConversation = createEmptyConversation();
        const initial = [firstConversation];
        conversationsRef.current = initial;
        setConversations(initial);
        setActiveConversationId(firstConversation.id);
        await saveConversations(userId!, initial);
        await saveActiveConversationId(userId!, firstConversation.id);
      } else {
        const normalizedConversations = repairStoredConversations(storedConversations);
        const activeId =
          storedActiveId && normalizedConversations.some((item) => item.id === storedActiveId)
            ? storedActiveId
            : normalizedConversations[0].id;

        conversationsRef.current = normalizedConversations;
        setConversations(normalizedConversations);
        setActiveConversationId(activeId);
        await saveConversations(userId!, normalizedConversations);
        await saveActiveConversationId(userId!, activeId);
      }

      setIsReady(true);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  const persistUpdater = useCallback(
    async (updater: (previous: Conversation[]) => Conversation[]) => {
      if (!userId) return;

      const nextConversations = sortConversations(updater(conversationsRef.current));
      conversationsRef.current = nextConversations;
      setConversations(nextConversations);

      try {
        await saveConversations(userId, nextConversations);
        setStorageWarning(null);
      } catch (error) {
        if (error instanceof ConversationStorageError) {
          setStorageWarning(error.message);
          return;
        }

        throw error;
      }
    },
    [userId]
  );

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;
      setActiveConversationId(conversationId);
      await saveActiveConversationId(userId, conversationId);
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
      const remaining = conversationsRef.current.filter(
        (conversation) => conversation.id !== conversationId
      );

      if (remaining.length === 0) {
        const conversation = createEmptyConversation();
        await persistUpdater(() => [conversation]);
        await selectConversation(conversation.id);
        return;
      }

      await persistUpdater((previous) =>
        previous.filter((conversation) => conversation.id !== conversationId)
      );

      if (activeConversationId === conversationId) {
        await selectConversation(remaining[0].id);
      }
    },
    [activeConversationId, persistUpdater, selectConversation]
  );

  const updateConversationMessages = useCallback(
    async (conversationId: string, messages: ChatMessage[]) => {
      const now = Date.now();
      const firstUserMessage = messages.find((message) => message.role === 'user');

      await persistUpdater((previous) =>
        previous.map((conversation) => {
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
    },
    [persistUpdater]
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
  };
}
