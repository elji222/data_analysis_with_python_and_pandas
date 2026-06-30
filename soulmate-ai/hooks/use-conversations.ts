import { useCallback, useEffect, useState } from 'react';

import {
  createConversationTitle,
  createEmptyConversation,
  loadActiveConversationId,
  loadConversations,
  saveActiveConversationId,
  saveConversations,
} from '@/services/conversation-storage';
import type { ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const [storedConversations, storedActiveId] = await Promise.all([
        loadConversations(),
        loadActiveConversationId(),
      ]);

      if (!isMounted) return;

      if (storedConversations.length === 0) {
        const firstConversation = createEmptyConversation();
        setConversations([firstConversation]);
        setActiveConversationId(firstConversation.id);
        await saveConversations([firstConversation]);
        await saveActiveConversationId(firstConversation.id);
      } else {
        const activeId =
          storedActiveId && storedConversations.some((item) => item.id === storedActiveId)
            ? storedActiveId
            : storedConversations[0].id;

        setConversations(storedConversations);
        setActiveConversationId(activeId);
        await saveActiveConversationId(activeId);
      }

      setIsReady(true);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  const persistConversations = useCallback(async (nextConversations: Conversation[]) => {
    const sorted = [...nextConversations].sort((a, b) => b.updatedAt - a.updatedAt);
    setConversations(sorted);
    await saveConversations(sorted);
  }, []);

  const selectConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await saveActiveConversationId(conversationId);
  }, []);

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
          conversation.title === 'New conversation' && firstUserMessage !== undefined;

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

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isReady,
    selectConversation,
    startNewConversation,
    deleteConversation,
    updateConversationMessages,
  };
}
