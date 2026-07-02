import { TITLE_MODEL } from '@/constants/ai';
import { normalizeConversationTitle } from '@/lib/conversation-title';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'AI is not configured yet. Add ANTHROPIC_API_KEY to your environment.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return Response.json({ error: 'Please send a message to summarize.' }, { status: 400 });
    }

    const anthropicResponse = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: TITLE_MODEL,
        max_tokens: 16,
        system:
          'You create short chat titles like ChatGPT. Reply with only 2 or 3 words. No quotes, punctuation, or explanation.',
        messages: [
          {
            role: 'user',
            content: `Create a 2-3 word title for a chat that starts with:\n\n${message}`,
          },
        ],
      }),
    });

    const json = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      const errorMessage =
        json.error?.message ?? 'Unable to generate a conversation title right now.';
      return Response.json({ error: errorMessage }, { status: anthropicResponse.status });
    }

    const rawTitle = json.content?.find(
      (block: { type?: string; text?: string }) => block.type === 'text'
    )?.text;

    const title = normalizeConversationTitle(typeof rawTitle === 'string' ? rawTitle : '');

    return Response.json({ title });
  } catch {
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
