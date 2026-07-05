import type { ChatAttachment, ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';
import {
  createConversationTitle,
  isDefaultConversationTitle,
  shouldShortenConversationTitle,
} from '@/lib/conversation-title';

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  message_text: string;
  attachments: ChatAttachment[] | null;
  created_at: string;
  sort_order: number;
};

export function conversationSignature(conversations: Conversation[]) {
  return JSON.stringify(
    conversations.map((conversation) => ({
      id: conversation.id,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messages.length,
      title: conversation.title,
    }))
  );
}

export function sortConversations(items: Conversation[]): Conversation[] {
  return [...items].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function mergeConversations(cloud: Conversation[], local: Conversation[]): Conversation[] {
  const byId = new Map<string, Conversation>();

  for (const conversation of cloud) {
    byId.set(conversation.id, conversation);
  }

  for (const conversation of local) {
    const existing = byId.get(conversation.id);
    if (!existing || conversation.updatedAt > existing.updatedAt) {
      byId.set(conversation.id, conversation);
    }
  }

  return sortConversations([...byId.values()]);
}

export function conversationsNeedCloudUpload(
  cloudConversations: Conversation[],
  mergedConversations: Conversation[]
) {
  return conversationSignature(cloudConversations) !== conversationSignature(mergedConversations);
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

export function repairStoredConversations(
  conversations: Conversation[],
  preferredActiveConversationId?: string | null,
  createEmpty: () => Conversation = () => ({
    id: `${Date.now()}`,
    title: 'New chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
): Conversation[] {
  const normalized = normalizeStoredConversations(conversations);
  const withMessages = normalized.filter((conversation) => conversation.messages.length > 0);
  const emptyNewChats = normalized.filter(
    (conversation) =>
      conversation.messages.length === 0 && isDefaultConversationTitle(conversation.title)
  );

  const preferredEmpty =
    preferredActiveConversationId &&
    emptyNewChats.find((conversation) => conversation.id === preferredActiveConversationId);

  const emptyToKeep = preferredEmpty ?? emptyNewChats[0] ?? null;

  if (withMessages.length > 0) {
    return sortConversations([...withMessages, ...(emptyToKeep ? [emptyToKeep] : [])]);
  }

  if (emptyToKeep) {
    return [emptyToKeep];
  }

  return [createEmpty()];
}

export function mapRowsToConversations(
  conversationRows: ConversationRow[],
  messageRows: MessageRow[]
): Conversation[] {
  const messagesByConversation = new Map<string, ChatMessage[]>();

  for (const row of messageRows) {
    const message: ChatMessage = {
      id: row.id,
      text: row.message_text,
      role: row.role,
      createdAt: new Date(row.created_at).getTime(),
      attachments: row.attachments ?? undefined,
    };

    const current = messagesByConversation.get(row.conversation_id) ?? [];
    current.push(message);
    messagesByConversation.set(row.conversation_id, current);
  }

  return conversationRows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages: (messagesByConversation.get(row.id) ?? []).sort(
      (left, right) => left.createdAt - right.createdAt
    ),
  }));
}

export function mapConversationToRows(userId: string, conversation: Conversation) {
  return {
    conversation: {
      id: conversation.id,
      user_id: userId,
      title: conversation.title,
      created_at: new Date(conversation.createdAt).toISOString(),
      updated_at: new Date(conversation.updatedAt).toISOString(),
      is_deleted: false,
    },
    messages: conversation.messages.map((message, index) => ({
      id: message.id,
      conversation_id: conversation.id,
      user_id: userId,
      role: message.role,
      message_text: message.text,
      attachments: message.attachments ?? null,
      created_at: new Date(message.createdAt).toISOString(),
      sort_order: index,
    })),
  };
}

export type { ConversationRow, MessageRow };
