import AsyncStorage from '@react-native-async-storage/async-storage';

import { createConversationTitle } from '@/lib/conversation-title';
import {
  isStorageQuotaError,
  stripConversationsForStorage,
} from '@/lib/strip-attachments-for-storage';
import type { Conversation } from '@/types/conversation';

function getStorageKeys(userId: string) {
  return {
    conversations: `@soulmate-ai/conversations/${userId}`,
    activeConversation: `@soulmate-ai/active-conversation/${userId}`,
  };
}

export class ConversationStorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ConversationStorageError';
  }
}

export async function clearConversationsStorage(userId: string): Promise<void> {
  const { conversations } = getStorageKeys(userId);
  await AsyncStorage.removeItem(conversations);
}

function toMinimalConversations(items: Conversation[]): Conversation[] {
  return items.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      text: message.text.slice(0, 4000),
      role: message.role,
      createdAt: message.createdAt,
    })),
  }));
}

export async function loadConversations(userId: string): Promise<Conversation[]> {
  const { conversations } = getStorageKeys(userId);
  const raw = await AsyncStorage.getItem(conversations);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Conversation[];
    return stripConversationsForStorage(parsed).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    await clearConversationsStorage(userId);
    return [];
  }
}

export async function saveConversations(userId: string, items: Conversation[]): Promise<void> {
  const { conversations } = getStorageKeys(userId);
  const storable = stripConversationsForStorage(items);

  try {
    await AsyncStorage.setItem(conversations, JSON.stringify(storable));
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) {
      throw error;
    }
  }

  const withoutAttachments = storable.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      attachments: undefined,
    })),
  }));

  try {
    await AsyncStorage.setItem(conversations, JSON.stringify(withoutAttachments));
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) {
      throw error;
    }
  }

  const minimal = toMinimalConversations(withoutAttachments).slice(0, 10);

  try {
    await AsyncStorage.setItem(conversations, JSON.stringify(minimal));
  } catch (retryError) {
    throw new ConversationStorageError(
      'Chat history is too large to save on this device. Your messages will stay in this session, but may not persist after refresh.',
      retryError
    );
  }
}

export async function loadActiveConversationId(userId: string): Promise<string | null> {
  const { activeConversation } = getStorageKeys(userId);
  return AsyncStorage.getItem(activeConversation);
}

export async function saveActiveConversationId(userId: string, id: string): Promise<void> {
  const { activeConversation } = getStorageKeys(userId);
  await AsyncStorage.setItem(activeConversation, id);
}

export { createConversationTitle } from '@/lib/conversation-title';

export function createEmptyConversation(): Conversation {
  const now = Date.now();
  return {
    id: `${now}`,
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
