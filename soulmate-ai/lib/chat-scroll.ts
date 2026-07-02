import type { ChatMessage } from '@/types/chat';

export type ScrollMetrics = {
  offsetY: number;
  contentHeight: number;
  viewportHeight: number;
};

export function getScrollProgress(metrics: ScrollMetrics): number {
  const maxOffset = Math.max(metrics.contentHeight - metrics.viewportHeight, 1);
  return Math.max(0, Math.min(1, metrics.offsetY / maxOffset));
}

export function shouldShowScrollToBottom(metrics: ScrollMetrics, threshold = 120): boolean {
  if (metrics.viewportHeight <= 0 || metrics.contentHeight <= metrics.viewportHeight) {
    return false;
  }

  return metrics.offsetY < metrics.contentHeight - metrics.viewportHeight - threshold;
}

export function buildUserScrollMarkers(messages: ChatMessage[]): Array<{
  id: string;
  listIndex: number;
  position: number;
}> {
  if (messages.length === 0) return [];

  const total = Math.max(messages.length - 1, 1);

  return messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.role === 'user')
    .map(({ message, index }) => ({
      id: message.id,
      listIndex: index,
      position: index / total,
    }));
}

export function getActiveUserMarkerId(
  messages: ChatMessage[],
  viewableListIndices: number[]
): string | null {
  const visibleUserIndices = viewableListIndices
    .filter((index) => messages[index]?.role === 'user')
    .sort((a, b) => a - b);

  if (visibleUserIndices.length === 0) {
    const firstUser = messages.find((message) => message.role === 'user');
    return firstUser?.id ?? null;
  }

  return messages[visibleUserIndices[0]]?.id ?? null;
}
