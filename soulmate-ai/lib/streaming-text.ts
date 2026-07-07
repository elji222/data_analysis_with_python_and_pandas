import type { ChatMessage } from '@/types/chat';

export const THINKING_PLACEHOLDER_ID = 'thinking-placeholder';
export const SEARCHING_PLACEHOLDER_ID = 'searching-placeholder';
export const STREAMING_ASSISTANT_ID = 'streaming-assistant';

export type ChatListOptions = {
  isStreaming: boolean;
  visibleStreamingText: string;
  showThinking: boolean;
  showSearching?: boolean;
};

export function getVisibleStreamingText(
  streamingText: string | null,
  smoothStreamingText: string
): string {
  if (streamingText === null) {
    return smoothStreamingText;
  }

  return smoothStreamingText;
}

export function buildChatListData(messages: ChatMessage[], options: ChatListOptions): ChatMessage[] {
  if (options.showSearching) {
    return [
      ...messages,
      {
        id: SEARCHING_PLACEHOLDER_ID,
        text: '',
        role: 'assistant',
        createdAt: Date.now(),
      },
    ];
  }

  if (options.showThinking) {
    return [
      ...messages,
      {
        id: THINKING_PLACEHOLDER_ID,
        text: '',
        role: 'assistant',
        createdAt: Date.now(),
      },
    ];
  }

  if (!options.isStreaming) {
    return messages;
  }

  const trimmedVisible = options.visibleStreamingText.trim();
  const lastMessage = messages[messages.length - 1];

  if (
    lastMessage?.role === 'assistant' &&
    trimmedVisible &&
    lastMessage.text.trim() === trimmedVisible
  ) {
    return messages;
  }

  if (!trimmedVisible) {
    return messages;
  }

  return [
    ...messages,
    {
      id: STREAMING_ASSISTANT_ID,
      text: options.visibleStreamingText,
      role: 'assistant',
      createdAt: Date.now(),
    },
  ];
}
