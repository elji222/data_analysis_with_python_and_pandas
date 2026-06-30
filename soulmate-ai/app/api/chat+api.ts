import { SOULMATE_SYSTEM_PROMPT } from '@/constants/ai';
import type { ChatApiMessage } from '@/types/chat';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'AI is not configured yet. Add OPENAI_API_KEY to your environment.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const messages = body.messages as ChatApiMessage[] | undefined;

    if (!messages?.length) {
      return Response.json({ error: 'Please send at least one message.' }, { status: 400 });
    }

    const openAiResponse = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SOULMATE_SYSTEM_PROMPT }, ...messages],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    const json = await openAiResponse.json();

    if (!openAiResponse.ok) {
      const errorMessage =
        json.error?.message ?? 'Unable to reach Soulmate AI right now. Please try again.';
      return Response.json({ error: errorMessage }, { status: openAiResponse.status });
    }

    const reply = json.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return Response.json({ error: 'Soulmate AI sent an empty reply.' }, { status: 500 });
    }

    return Response.json({ reply });
  } catch {
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
