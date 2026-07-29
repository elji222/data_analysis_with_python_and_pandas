import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/build-chat-api-messages', () => ({
  buildChatApiMessages: vi.fn(),
}));

vi.mock('@/lib/api-origin', () => ({
  getApiUrl: vi.fn(),
}));

import { parseSseText, processSseEventBlocks } from '@/services/chat-api';

describe('chat-api sse parsing', () => {
  it('accumulates streamed text deltas from SSE blocks', () => {
    const onDelta = vi.fn();
    const sse = [
      'data: {"text":"Hello"}',
      '',
      'data: {"text":" world"}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    const reply = parseSseText(sse, { onDelta });

    expect(reply).toBe('Hello world');
    expect(onDelta).toHaveBeenLastCalledWith('Hello world');
  });

  it('handles partial trailing buffer chunks like React Native fetch', () => {
    const onDelta = vi.fn();
    const fullText = processSseEventBlocks(
      ['data: {"text":"Hi"}', 'data: {"text":" there"}'],
      { onDelta },
      ''
    );

    expect(fullText).toBe('Hi there');
    expect(onDelta).toHaveBeenLastCalledWith('Hi there');
  });

  it('throws when the stream contains no assistant text', () => {
    expect(() => parseSseText('data: [DONE]\n\n', { onDelta: vi.fn() })).toThrow(
      'Soulmate AI sent an empty reply.'
    );
  });
});
