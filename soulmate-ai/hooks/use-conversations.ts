import { useCallback, useEffect, useState } from 'react';

import {
  createConversationTitle,
  createEmptyConversation,
  loadActiveConversationId,
  loadConversations,
  saveActiveConversationId,
  saveConversations,
} from '@/services/conversation-storage';
import { isDefaultConversationTitle, shouldShortenConversationTitle } from '@/lib/conversation-title';
import type { ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

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

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setActiveConversationId(null);
      setIsReady(false);
      return;
    }

    let isMounted = true;

    async function hydrate() {
      const [storedConversations, storedActiveId] = await Promise.all([
        loadConversations(userId),
        loadActiveConversationId(userId),
      ]);

      if (!isMounted) return;

      if (storedConversations.length === 0) {
        const firstConversation = createEmptyConversation();
        setConversations([firstConversation]);
        setActiveConversationId(firstConversation.id);
        await saveConversations(userId, [firstConversation]);
        await saveActiveConversationId(userId, firstConversation.id);
      } else {
        const normalizedConversations = normalizeStoredConversations(storedConversations);
        const activeId =
          storedActiveId && normalizedConversations.some((item) => item.id === storedActiveId)
            ? storedActiveId
            : normalizedConversations[0].id;

        setConversations(normalizedConversations);
        setActiveConversationId(activeId);
        await saveConversations(userId, normalizedConversations);
        await saveActiveConversationId(userId, activeId);
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

  const persistConversations = useCallback(
    async (nextConversations: Conversation[]) => {
      if (!userId) return;
      const sorted = [...nextConversations].sort((a, b) => b.updatedAt - a.updatedAt);
      setConversations(sorted);
      await saveConversations(userId, sorted);
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
    const nextConversations = [conversation, ...conversations];
    await persistConversations(nextConversations);
    await selectConversation(conversation.id);
    return conversation.id;
  }, [conversations, persistConversations, selectConversation]);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      const nextConversations = conversations.filter(
        (conversation) => conversation.id !== conversationId
      );

      if (nextConversations.length === 0) {
        const conversation = createEmptyConversation();
        await persistConversations([conversation]);
        await selectConversation(conversation.id);
        return;
      }

      await persistConversations(nextConversations);

      if (activeConversationId === conversationId) {
        await selectConversation(nextConversations[0].id);
      }
    },
    [activeConversationId, conversations, persistConversations, selectConversation]
  );

  const updateConversationMessages = useCallback(
    async (conversationId: string, messages: ChatMessage[]) => {
      const now = Date.now();
      const firstUserMessage = messages.find((message) => message.role === 'user');

      const nextConversations = conversations.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;

        const shouldRename =
          isDefaultConversationTitle(conversation.title) && firstUserMessage !== undefined;

        return {
          ...conversation,
          messages,
          title: shouldRename
            ? createConversationTitle(firstUserMessage.text)
            : conversation.title,
          updatedAt: now,
        };
      });

      await persistConversations(nextConversations);
    },
    [conversations, persistConversations]
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const nextConversations = conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title: trimmedTitle, updatedAt: Date.now() }
          : conversation
      );

      await persistConversations(nextConversations);
    },
    [conversations, persistConversations]
  );

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isReady,
    selectConversation,
    startNewConversation,
    deleteConversation,
    updateConversationMessages,
    renameConversation,
  };
}
