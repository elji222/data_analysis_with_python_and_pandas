import type { ChatApiMessage } from '@/types/chat';

type StreamEvent = {
  text?: string;
  error?: string;
};

export async function streamChatMessage(
  messages: ChatApiMessage[],
  onDelta: (fullText: string) => void
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ messages }),
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    const data = contentType.includes('application/json')
      ? ((await response.json()) as { error?: string })
      : { error: 'Something went wrong. Please try again.' };
    throw new Error(data.error ?? 'Something went wrong. Please try again.');
  }

  if (!contentType.includes('text/event-stream') || !response.body) {
    const data = (await response.json()) as { reply?: string; error?: string };
    if (data.error) throw new Error(data.error);
    if (!data.reply) throw new Error('No reply received. Please try again.');
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
