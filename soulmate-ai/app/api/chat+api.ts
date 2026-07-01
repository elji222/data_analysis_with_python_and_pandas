import { CLAUDE_MODEL, SOULMATE_SYSTEM_PROMPT } from '@/constants/ai';
import type { ChatApiMessage } from '@/types/chat';

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
    const messages = body.messages as ChatApiMessage[] | undefined;

    if (!messages?.length) {
      return Response.json({ error: 'Please send at least one message.' }, { status: 400 });
    }

    const anthropicResponse = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system: SOULMATE_SYSTEM_PROMPT,
        messages,
      }),
    });

    const json = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      const errorMessage =
        json.error?.message ?? 'Unable to reach Soulmate AI right now. Please try again.';
      return Response.json({ error: errorMessage }, { status: anthropicResponse.status });
    }

    const reply = json.content?.find((block: { type: string }) => block.type === 'text')?.text?.trim();

    if (!reply) {
      return Response.json({ error: 'Soulmate AI sent an empty reply.' }, { status: 500 });
    }

    return Response.json({ reply });
  } catch {
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
