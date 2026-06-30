import type { ChatApiMessage } from '@/types/chat';

type ChatApiResponse = {
  reply?: string;
  error?: string;
};

export async function sendChatMessage(messages: ChatApiMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const data = (await response.json()) as ChatApiResponse;

  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong. Please try again.');
  }

  if (!data.reply) {
    throw new Error('No reply received. Please try again.');
  }

  return data.reply;
}
