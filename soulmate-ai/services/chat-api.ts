import { buildChatApiMessages } from '@/lib/build-chat-api-messages';
import { getApiUrl } from '@/lib/api-origin';
import type { GeneratedImage } from '@/lib/agent/types';
import type { ChatMessage } from '@/types/chat';

type SseStreamEvent = {
  text?: string;
  error?: string;
  imageError?: string;
  savedMemories?: string[];
  status?: 'searching' | 'generating_image';
  generatedImage?: GeneratedImage;
};

type SseEventHandlers = {
  onDelta: (fullText: string) => void;
  onSavedMemories?: (savedMemories: string[]) => void;
  onStatus?: (status: 'searching' | 'generating_image') => void;
  onGeneratedImage?: (image: GeneratedImage) => void;
  onImageError?: (error: string) => void;
};

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

export function processSseDataLine(
  data: string,
  handlers: SseEventHandlers,
  fullText: string
): string {
  if (!data) return fullText;
  if (data === '[DONE]') return fullText;

  try {
    const parsed = JSON.parse(data) as SseStreamEvent;
    if (parsed.error) throw new Error(parsed.error);
    if (parsed.savedMemories?.length) {
      handlers.onSavedMemories?.(parsed.savedMemories);
    }
    if (parsed.status === 'searching' || parsed.status === 'generating_image') {
      handlers.onStatus?.(parsed.status);
    }
    if (parsed.generatedImage) {
      handlers.onGeneratedImage?.(parsed.generatedImage);
    }
    if (parsed.imageError) {
      handlers.onImageError?.(parsed.imageError);
    }
    if (parsed.text) {
      fullText += parsed.text;
      handlers.onDelta(fullText);
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
      if (error instanceof SyntaxError) {
        return fullText;
      }
      throw error;
    }
  }

  return fullText;
}

export function processSseEventBlocks(
  eventBlocks: string[],
  handlers: SseEventHandlers,
  fullText: string
): string {
  for (const eventBlock of eventBlocks) {
    const line = eventBlock
      .split('\n')
      .find((entry) => entry.startsWith('data: '));
    if (!line) continue;

    fullText = processSseDataLine(line.slice(6).trim(), handlers, fullText);
  }

  return fullText;
}

export function parseSseText(text: string, handlers: SseEventHandlers): string {
  const events = text.split('\n\n');
  const fullText = processSseEventBlocks(events, handlers, '');

  if (!fullText.trim()) {
    throw new Error('Soulmate AI sent an empty reply.');
  }

  return fullText;
}

async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  handlers: SseEventHandlers
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    fullText = processSseEventBlocks(events, handlers, fullText);
  }

  if (buffer.trim()) {
    fullText = processSseEventBlocks([buffer], handlers, fullText);
  }

  if (!fullText.trim()) {
    throw new Error('Soulmate AI sent an empty reply.');
  }

  return fullText;
}

export type StreamChatOptions = {
  accessToken?: string | null;
  conversationId?: string;
  messageId?: string;
  onSavedMemories?: (savedMemories: string[]) => void;
  onStatus?: (status: 'searching' | 'generating_image') => void;
  onGeneratedImage?: (image: GeneratedImage) => void;
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

  const handlers: SseEventHandlers = {
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
