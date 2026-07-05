import type {
  MemoryCategory,
  UserMemory,
  UserMemorySettings,
} from '@/types/memory';

type MemoriesResponse = {
  settings: UserMemorySettings;
  memories: UserMemory[];
};

type ChatApiResponse = {
  reply?: string;
  savedMemories?: string[];
  error?: string;
};

async function authHeaders(accessToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchMemories(accessToken: string): Promise<MemoriesResponse> {
  const response = await fetch('/api/memories', {
    headers: await authHeaders(accessToken),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load memories.');
  }
  return data as MemoriesResponse;
}

export async function createMemory(
  accessToken: string,
  input: {
    category: MemoryCategory;
    memory_text: string;
    is_pinned?: boolean;
  }
): Promise<UserMemory> {
  const response = await fetch('/api/memories', {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Could not create memory.');
  }
  return data.memory as UserMemory;
}

export async function updateMemory(
  accessToken: string,
  input: {
    id: string;
    memory_text?: string;
    category?: MemoryCategory;
    is_pinned?: boolean;
    importance?: number;
  }
): Promise<UserMemory> {
  const response = await fetch('/api/memories', {
    method: 'PATCH',
    headers: await authHeaders(accessToken),
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Could not update memory.');
  }
  return data.memory as UserMemory;
}

export async function deleteMemory(accessToken: string, id: string): Promise<void> {
  const response = await fetch(`/api/memories?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeaders(accessToken),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Could not delete memory.');
  }
}

export async function clearAllMemories(accessToken: string): Promise<void> {
  const response = await fetch('/api/memories', {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ action: 'clear' }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Could not clear memories.');
  }
}

export async function updateMemorySettings(
  accessToken: string,
  patch: Partial<Pick<UserMemorySettings, 'enabled' | 'preferred_language' | 'answer_style'>>
): Promise<UserMemorySettings> {
  const response = await fetch('/api/memories', {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ action: 'settings', ...patch }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Could not update memory settings.');
  }
  return data.settings as UserMemorySettings;
}

export type SendChatOptions = {
  accessToken: string;
  conversationId?: string;
  messageId?: string;
  skipMemory?: boolean;
};

export async function sendChatMessageWithMemory(
  messages: { role: 'user' | 'assistant'; content: string }[],
  options: SendChatOptions
): Promise<{ reply: string; savedMemories: string[] }> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: await authHeaders(options.accessToken),
    body: JSON.stringify({
      messages,
      conversationId: options.conversationId,
      messageId: options.messageId,
      skipMemory: options.skipMemory,
    }),
  });

  const data = (await response.json()) as ChatApiResponse;
  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong. Please try again.');
  }
  if (!data.reply) {
    throw new Error('No reply received. Please try again.');
  }

  return {
    reply: data.reply,
    savedMemories: data.savedMemories ?? [],
  };
}
