import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Conversation } from '@/types/conversation';

const CONVERSATIONS_KEY = '@soulmate-ai/conversations';
const ACTIVE_CONVERSATION_KEY = '@soulmate-ai/active-conversation-id';

export async function loadConversations(): Promise<Conversation[]> {
  const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Conversation[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

export async function loadActiveConversationId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_CONVERSATION_KEY);
}

export async function saveActiveConversationId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
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
