import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/build-chat-api-messages', () => ({
  buildChatApiMessages: vi.fn(),
}));

vi.mock('@/lib/api-origin', () => ({
  getApiUrl: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import {
  parseSseText,
  processSseEventBlocks,
  takeCompleteSseEvents,
  toApiErrorMessage,
} from '@/services/chat-api';

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

describe('takeCompleteSseEvents', () => {
  it('holds back a partial trailing event', () => {
    expect(takeCompleteSseEvents('data: {"text":"Hi"}\n\ndata: {"tex', false)).toBe(
      'data: {"text":"Hi"}\n\n'
    );
  });

  it('returns nothing when no event has fully arrived', () => {
    expect(takeCompleteSseEvents('data: {"tex', false)).toBe('');
  });

  it('consumes the remainder on the final chunk', () => {
    expect(takeCompleteSseEvents('data: [DONE]\n\n', true)).toBe('data: [DONE]\n\n');
  });

  it('streams incrementally without losing or repeating text', () => {
    const onDelta = vi.fn();
    const handlers = { onDelta };
    const body = 'data: {"text":"He"}\n\ndata: {"text":"llo"}\n\ndata: [DONE]\n\n';

    let consumed = 0;
    let fullText = '';

    // Mirrors how XHR exposes a growing responseText while the reply streams.
    for (let received = 1; received <= body.length; received += 7) {
      const raw = body.slice(0, Math.min(received, body.length));
      const consumable = takeCompleteSseEvents(raw.slice(consumed), false);
      if (!consumable) continue;

      consumed += consumable.length;
      fullText = processSseEventBlocks(consumable.split('\n\n'), handlers, fullText);
    }

    const tail = takeCompleteSseEvents(body.slice(consumed), true);
    if (tail) {
      fullText = processSseEventBlocks(tail.split('\n\n'), handlers, fullText);
    }

    expect(fullText).toBe('Hello');
    expect(onDelta.mock.calls.map(([text]) => text)).toEqual(['He', 'Hello']);
  });
});

describe('toApiErrorMessage', () => {
  it('prefers the structured error field', () => {
    expect(toApiErrorMessage('{"error":"Subscription required."}')).toBe(
      'Subscription required.'
    );
  });

  it('reports HTML responses as an unexpected page', () => {
    expect(toApiErrorMessage('<!doctype html><html></html>')).toBe(
      'Server returned an unexpected page. Try again in a moment.'
    );
  });
});
