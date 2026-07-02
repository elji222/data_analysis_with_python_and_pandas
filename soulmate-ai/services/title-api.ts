import { createConversationTitle, normalizeConversationTitle } from '@/lib/conversation-title';

export async function fetchConversationTitle(message: string): Promise<string> {
  const fallback = createConversationTitle(message);

  try {
    const response = await fetch('/api/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as { title?: string };
    if (!data.title) {
      return fallback;
    }

    return normalizeConversationTitle(data.title);
  } catch {
    return fallback;
  }
}
