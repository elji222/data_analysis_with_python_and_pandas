import type { GeneratedImage } from '@/lib/agent/types';

export type SseStreamEvent = {
  text?: string;
  error?: string;
  imageError?: string;
  savedMemories?: string[];
  status?: 'searching' | 'generating_image';
  generatedImage?: GeneratedImage;
};

export type SseEventHandlers = {
  onDelta: (fullText: string) => void;
  onSavedMemories?: (savedMemories: string[]) => void;
  onStatus?: (status: 'searching' | 'generating_image') => void;
  onGeneratedImage?: (image: GeneratedImage) => void;
  onImageError?: (error: string) => void;
};

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

export async function consumeSseStream(
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
