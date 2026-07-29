import { buildChatApiMessages } from '@/lib/build-chat-api-messages';
import { getApiUrl } from '@/lib/api-origin';
import { consumeSseStream, parseSseText } from '@/lib/sse-parser';
import type { ChatMessage } from '@/types/chat';

async function readApiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  try {
    const data = JSON.parse(text) as { error?: string };
    return data.error ?? 'Something went wrong. Please try again.';
  } catch {
    const trimmed = text.trim();
    if (!trimmed) {
      return 'Something went wrong. Please try again.';
    }

    if (trimmed.startsWith('<')) {
      return 'Server returned an unexpected page. Try again in a moment.';
    }

    return trimmed.slice(0, 180);
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Server returned an unexpected response. Try again in a moment.');
  }
}

export type StreamChatOptions = {
  accessToken?: string | null;
  conversationId?: string;
  messageId?: string;
  onSavedMemories?: (savedMemories: string[]) => void;
  onStatus?: (status: 'searching' | 'generating_image') => void;
  onGeneratedImage?: (image: import('@/lib/agent/types').GeneratedImage) => void;
  onImageError?: (error: string) => void;
};

export async function streamChatMessage(
  messages: ChatMessage[],
  onDelta: (fullText: string) => void,
  options: StreamChatOptions = {}
): Promise<string> {
  const apiMessages = buildChatApiMessages(messages);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(getApiUrl('/api/chat'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: apiMessages,
      conversationId: options.conversationId,
      messageId: latestUserMessage?.id ?? options.messageId,
    }),
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const handlers = {
    onDelta,
    onSavedMemories: options.onSavedMemories,
    onStatus: options.onStatus,
    onGeneratedImage: options.onGeneratedImage,
    onImageError: options.onImageError,
  };

  if (contentType.includes('text/event-stream')) {
    if (response.body) {
      return consumeSseStream(response.body, handlers);
    }

    const text = await response.text();
    return parseSseText(text, handlers);
  }

  const data = await readJsonResponse<{
    reply?: string;
    error?: string;
    savedMemories?: string[];
  }>(response);
  if (data.error) throw new Error(data.error);
  if (!data.reply) throw new Error('No reply received. Please try again.');
  if (data.savedMemories?.length) {
    options.onSavedMemories?.(data.savedMemories);
  }
  onDelta(data.reply);
  return data.reply;
}
