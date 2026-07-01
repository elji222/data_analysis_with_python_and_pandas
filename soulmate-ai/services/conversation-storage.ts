import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Conversation } from '@/types/conversation';

function getStorageKeys(userId: string) {
  return {
    conversations: `@soulmate-ai/conversations/${userId}`,
    activeConversation: `@soulmate-ai/active-conversation/${userId}`,
  };
}

export async function loadConversations(userId: string): Promise<Conversation[]> {
  const { conversations } = getStorageKeys(userId);
  const raw = await AsyncStorage.getItem(conversations);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Conversation[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveConversations(userId: string, items: Conversation[]): Promise<void> {
  const { conversations } = getStorageKeys(userId);
  await AsyncStorage.setItem(conversations, JSON.stringify(items));
}

export async function loadActiveConversationId(userId: string): Promise<string | null> {
  const { activeConversation } = getStorageKeys(userId);
  return AsyncStorage.getItem(activeConversation);
}

export async function saveActiveConversationId(userId: string, id: string): Promise<void> {
  const { activeConversation } = getStorageKeys(userId);
  await AsyncStorage.setItem(activeConversation, id);
}

export function createConversationTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (!trimmed) return 'New conversation';
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

export function createEmptyConversation(): Conversation {
  const now = Date.now();
  return {
    id: `${now}`,
    title: 'New conversation',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
