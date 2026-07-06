import { describe, expect, it } from 'vitest';

import {
  buildChatListData,
  getVisibleStreamingText,
  THINKING_PLACEHOLDER_ID,
} from '@/lib/streaming-text';
import type { ChatMessage } from '@/types/chat';

const baseMessages: ChatMessage[] = [
  {
    id: 'user-1',
    text: 'Hi',
    role: 'user',
    createdAt: 1,
  },
];

describe('getVisibleStreamingText', () => {
  it('uses the smooth animation while streaming', () => {
    expect(getVisibleStreamingText('hello world', 'hel')).toBe('hel');
  });

  it('falls back to the smooth animation before live text arrives', () => {
    expect(getVisibleStreamingText(null, 'hello there')).toBe('hello there');
  });
});

describe('buildChatListData', () => {
  it('appends thinking dots directly below the latest message', () => {
    const list = buildChatListData(baseMessages, {
      isStreaming: false,
      visibleStreamingText: '',
      showThinking: true,
    });

    expect(list).toHaveLength(2);
    expect(list[1].id).toBe(THINKING_PLACEHOLDER_ID);
  });

  it('appends a temporary streaming assistant bubble', () => {
    const list = buildChatListData(baseMessages, {
      isStreaming: true,
      visibleStreamingText: 'Hi Elchanan',
      showThinking: false,
    });

    expect(list).toHaveLength(2);
    expect(list[1].id).toBe('streaming-assistant');
    expect(list[1].text).toBe('Hi Elchanan');
  });

  it('does not duplicate when the final assistant message is already saved', () => {
    const messages: ChatMessage[] = [
      ...baseMessages,
      {
        id: 'assistant-1',
        text: 'Hi Elchanan',
        role: 'assistant',
        createdAt: 2,
      },
    ];

    const list = buildChatListData(messages, {
      isStreaming: true,
      visibleStreamingText: 'Hi Elchanan',
      showThinking: false,
    });

    expect(list).toHaveLength(2);
    expect(list[1].id).toBe('assistant-1');
  });
});
