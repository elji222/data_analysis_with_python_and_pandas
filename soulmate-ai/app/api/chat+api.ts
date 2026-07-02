import {
  CLAUDE_MODEL,
  MAX_OUTPUT_TOKENS,
  SOULMATE_SYSTEM_PROMPT,
} from '@/constants/ai';
import type { ChatApiMessage } from '@/types/chat';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function sseLine(payload: string) {
  return `data: ${payload}\n\n`;
}

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
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SOULMATE_SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!anthropicResponse.ok) {
      const json = await anthropicResponse.json();
      const errorMessage =
        json.error?.message ?? 'Unable to reach Soulmate AI right now. Please try again.';
      return Response.json({ error: errorMessage }, { status: anthropicResponse.status });
    }

    if (!anthropicResponse.body) {
      return Response.json({ error: 'No response stream received.' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = anthropicResponse.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6).trim();
              if (!data || data === '[DONE]') continue;

              try {
                const event = JSON.parse(data) as {
                  type?: string;
                  delta?: { type?: string; text?: string };
                  error?: { message?: string };
                };

                if (event.type === 'error') {
                  controller.enqueue(
                    encoder.encode(sseLine(JSON.stringify({ error: event.error?.message })))
                  );
                  continue;
                }

                if (
                  event.type === 'content_block_delta' &&
                  event.delta?.type === 'text_delta' &&
                  event.delta.text
                ) {
                  controller.enqueue(
                    encoder.encode(sseLine(JSON.stringify({ text: event.delta.text })))
                  );
                }
              } catch {
                // Skip malformed SSE chunks
              }
            }
          }

          controller.enqueue(encoder.encode(sseLine('[DONE]')));
        } catch {
          controller.enqueue(
            encoder.encode(sseLine(JSON.stringify({ error: 'Stream interrupted.' })))
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
