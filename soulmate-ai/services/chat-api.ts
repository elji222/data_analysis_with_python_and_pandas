import { buildChatApiMessages } from '@/lib/build-chat-api-messages';
import { getApiUrl } from '@/lib/api-origin';
import { formatChatError } from '@/lib/upload-errors';
import type { ChatApiMessage, ChatMessage } from '@/types/chat';

type StreamEvent = {
  text?: string;
  error?: string;
  savedMemories?: string[];
  status?: 'searching';
};

export type StreamChatOptions = {
  accessToken?: string | null;
  conversationId?: string;
  messageId?: string;
  onSavedMemories?: (savedMemories: string[]) => void;
  onStatus?: (status: 'searching') => void;
};

export async function streamChatMessage(
  messages: ChatMessage[],
  onDelta: (fullText: string) => void,
  options: StreamChatOptions = {}
): Promise<string> {
  const apiMessages: ChatApiMessage[] = buildChatApiMessages(messages);
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
  }).catch((error) => {
    throw new Error(formatChatError(error));
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    const data = contentType.includes('application/json')
      ? ((await response.json()) as { error?: string })
      : { error: 'Something went wrong. Please try again.' };
    throw new Error(data.error ?? 'Something went wrong. Please try again.');
  }

  if (!contentType.includes('text/event-stream') || !response.body) {
    const data = (await response.json()) as {
      reply?: string;
      error?: string;
      savedMemories?: string[];
    };
    if (data.error) throw new Error(data.error);
    if (!data.reply) throw new Error('No reply received. Please try again.');
    if (data.savedMemories?.length) {
      options.onSavedMemories?.(data.savedMemories);
    }
    onDelta(data.reply);
    return data.reply;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const eventBlock of events) {
      const line = eventBlock
        .split('\n')
        .find((entry) => entry.startsWith('data: '));
      if (!line) continue;

      const data = line.slice(6).trim();
      if (!data) continue;
      if (data === '[DONE]') return fullText;

      try {
        const parsed = JSON.parse(data) as StreamEvent;
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.savedMemories?.length) {
          options.onSavedMemories?.(parsed.savedMemories);
        }
        if (parsed.status === 'searching') {
          options.onStatus?.('searching');
        }
        if (parsed.text) {
          fullText += parsed.text;
          onDelta(fullText);
        }
      } catch (error) {
        if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
          throw error;
        }
      }
    }
  }

  if (!fullText.trim()) {
    throw new Error('Soulmate AI sent an empty reply.');
  }

  return fullText;
}
