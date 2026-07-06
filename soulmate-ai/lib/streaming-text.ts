import type { ChatMessage } from '@/types/chat';

export function getVisibleStreamingText(
  streamingText: string | null,
  smoothStreamingText: string
): string {
  if (streamingText) {
    return streamingText;
  }

  return smoothStreamingText;
}

export function buildChatListData(
  messages: ChatMessage[],
  isStreaming: boolean,
  visibleStreamingText: string
): ChatMessage[] {
  if (!isStreaming) {
    return messages;
  }

  const trimmedVisible = visibleStreamingText.trim();
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
      id: 'streaming-assistant',
      text: visibleStreamingText,
      role: 'assistant',
      createdAt: Date.now(),
    },
  ];
}
