import { Platform } from 'react-native';

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

export function toApiErrorMessage(text: string): string {
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

async function readApiErrorMessage(response: Response): Promise<string> {
  return toApiErrorMessage(await response.text());
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.message === 'Aborted')
  );
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

/**
 * Returns the portion of a partially received SSE body that contains only whole
 * `\n\n`-delimited events. A trailing fragment is left for the next chunk so an
 * event is never parsed before it has fully arrived.
 */
export function takeCompleteSseEvents(pending: string, isFinalChunk: boolean): string {
  if (isFinalChunk) return pending;

  const lastBoundary = pending.lastIndexOf('\n\n');
  if (lastBoundary === -1) return '';

  return pending.slice(0, lastBoundary + 2);
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      fullText = processSseEventBlocks(events, handlers, fullText);
    }
  } catch (error) {
    // Stopping generation keeps whatever text already arrived.
    if (isAbortError(error)) {
      return fullText;
    }

    throw error;
  }

  if (buffer.trim()) {
    fullText = processSseEventBlocks([buffer], handlers, fullText);
  }

  if (!fullText.trim()) {
    throw new Error('Soulmate AI sent an empty reply.');
  }

  return fullText;
}

/**
 * React Native's `fetch` resolves without a readable `body`, so awaiting the
 * response would hold every token back until generation finished. `XMLHttpRequest`
 * exposes `responseText` while the request is still in flight, which is what lets
 * replies appear token by token on device.
 */
function streamSseViaXhr(
  url: string,
  headers: Record<string, string>,
  requestBody: string,
  handlers: SseEventHandlers,
  signal?: AbortSignal | null
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let consumedLength = 0;
    let fullText = '';
    let isSettled = false;
    let isAborted = false;
    let removeAbortListener: (() => void) | null = null;

    const settle = (finish: () => void) => {
      if (isSettled) return;
      isSettled = true;
      removeAbortListener?.();
      finish();
    };

    // Only whole `\n\n`-delimited events are parsed; a partial trailing event stays
    // buffered until the rest of it arrives.
    const drain = (isFinalChunk: boolean) => {
      const raw = xhr.responseText ?? '';
      if (raw.length <= consumedLength) return;

      const consumable = takeCompleteSseEvents(raw.slice(consumedLength), isFinalChunk);
      if (!consumable) return;

      consumedLength += consumable.length;
      fullText = processSseEventBlocks(consumable.split('\n\n'), handlers, fullText);
    };

    xhr.open('POST', url, true);
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));

    xhr.onreadystatechange = () => {
      // Stopping generation keeps whatever text already arrived.
      if (isAborted) {
        settle(() => resolve(fullText));
        return;
      }

      const isSuccess = xhr.status >= 200 && xhr.status < 300;

      if (xhr.readyState === 3 && isSuccess) {
        try {
          drain(false);
        } catch (error) {
          settle(() => {
            xhr.abort();
            reject(error);
          });
        }
        return;
      }

      if (xhr.readyState !== 4) return;

      if (!isSuccess) {
        settle(() => reject(new Error(toApiErrorMessage(xhr.responseText ?? ''))));
        return;
      }

      try {
        drain(true);
      } catch (error) {
        settle(() => reject(error));
        return;
      }

      if (fullText.trim()) {
        settle(() => resolve(fullText));
        return;
      }

      // A non-streaming JSON reply can still come back on this endpoint.
      try {
        const data = JSON.parse(xhr.responseText ?? '') as {
          reply?: string;
          error?: string;
          savedMemories?: string[];
        };

        if (data.error) {
          settle(() => reject(new Error(data.error)));
          return;
        }

        if (data.reply) {
          if (data.savedMemories?.length) {
            handlers.onSavedMemories?.(data.savedMemories);
          }
          handlers.onDelta(data.reply);
          settle(() => resolve(data.reply!));
          return;
        }
      } catch {
        // Fall through to the empty-reply error below.
      }

      settle(() => reject(new Error('Soulmate AI sent an empty reply.')));
    };

    xhr.onerror = () => {
      if (isAborted) {
        settle(() => resolve(fullText));
        return;
      }

      settle(() => reject(new Error('Could not reach Soulmate AI. Check your connection.')));
    };

    xhr.ontimeout = () => {
      settle(() => reject(new Error('The request timed out. Please try again.')));
    };

    if (signal) {
      const onAbort = () => {
        // Set before aborting: `abort()` fires the state handler synchronously,
        // and it must resolve with the partial reply rather than reject.
        isAborted = true;

        try {
          xhr.abort();
        } catch {
          // The request may already be finished.
        }

        settle(() => resolve(fullText));
      };

      if (signal.aborted) {
        onAbort();
        return;
      }

      signal.addEventListener('abort', onAbort);
      removeAbortListener = () => signal.removeEventListener('abort', onAbort);
    }

    xhr.send(requestBody);
  });
}

export type StreamChatOptions = {
  accessToken?: string | null;
  conversationId?: string;
  messageId?: string;
  model?: string;
  onSavedMemories?: (savedMemories: string[]) => void;
  onStatus?: (status: 'searching' | 'generating_image') => void;
  onGeneratedImage?: (image: GeneratedImage) => void;
  onImageError?: (error: string) => void;
  signal?: AbortSignal | null;
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

  const requestBody = JSON.stringify({
    messages: apiMessages,
    conversationId: options.conversationId,
    messageId: latestUserMessage?.id ?? options.messageId,
    model: options.model,
  });

  const handlers: SseEventHandlers = {
    onDelta,
    onSavedMemories: options.onSavedMemories,
    onStatus: options.onStatus,
    onGeneratedImage: options.onGeneratedImage,
    onImageError: options.onImageError,
  };

  if (Platform.OS !== 'web') {
    return streamSseViaXhr(
      getApiUrl('/api/chat'),
      headers,
      requestBody,
      handlers,
      options.signal
    );
  }

  const response = await fetch(getApiUrl('/api/chat'), {
    method: 'POST',
    headers,
    body: requestBody,
    signal: options.signal ?? undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

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
