import {
  CLAUDE_MODEL,
  MAX_OUTPUT_TOKENS,
  SOULMATE_SYSTEM_PROMPT,
} from '@/constants/ai';
import { buildChatSystemPrompt } from '@/lib/memory/prompt';
import { processMessageMemory } from '@/lib/memory/process';
import {
  ensureMemorySettings,
  listActiveMemories,
} from '@/lib/memory/repository';
import { filterMemoriesForAiPrompt, rankMemoriesForQuery } from '@/lib/memory/search';
import {
  createSupabaseServerClient,
  getAuthenticatedUserId,
  getBearerToken,
} from '@/lib/supabase-server';
import type { ApiContentBlock, ApiTextBlock, ChatApiMessage } from '@/types/chat';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function sseLine(payload: string) {
  return `data: ${payload}\n\n`;
}

function getMessageText(content: string | ApiContentBlock[]): string {
  if (typeof content === 'string') return content;

  return content
    .filter((block): block is ApiTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

const MEMORY_CONTEXT_TIMEOUT_MS = 350;

async function resolveSystemPrompt(
  userId: string | null,
  accessToken: string | null,
  messages: ChatApiMessage[],
  skipMemory: boolean
) {
  let systemPrompt = SOULMATE_SYSTEM_PROMPT;
  const memoryEnabled = Boolean(userId && accessToken && !skipMemory);

  if (!memoryEnabled) {
    return { systemPrompt, memoryEnabled: false };
  }

  const client = createSupabaseServerClient(accessToken!);
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

  const memoryContext = await Promise.race([
    (async () => {
      const [settings, memories] = await Promise.all([
        ensureMemorySettings(client, userId!),
        listActiveMemories(client, userId!),
      ]);

      if (!settings.enabled) {
        return 'disabled' as const;
      }

      const filteredMemories = filterMemoriesForAiPrompt(memories);
      const relevant = rankMemoriesForQuery(
        filteredMemories,
        getMessageText(latestUserMessage),
        15
      );

      return buildChatSystemPrompt(settings, relevant);
    })(),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), MEMORY_CONTEXT_TIMEOUT_MS);
    }),
  ]);

  if (memoryContext === 'disabled') {
    return { systemPrompt, memoryEnabled: false };
  }

  if (memoryContext) {
    systemPrompt = memoryContext;
  }

  return { systemPrompt, memoryEnabled: true };
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
    const [body, userId] = await Promise.all([request.json(), getAuthenticatedUserId(request)]);
    const messages = body.messages as ChatApiMessage[] | undefined;
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
    const messageId = typeof body.messageId === 'string' ? body.messageId : null;
    const skipMemory = body.skipMemory === true;

    if (!messages?.length) {
      return Response.json({ error: 'Please send at least one message.' }, { status: 400 });
    }

    const accessToken = getBearerToken(request);
    const { systemPrompt, memoryEnabled } = await resolveSystemPrompt(
      userId,
      accessToken,
      messages,
      skipMemory
    );

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
        system: systemPrompt,
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
        let fullReply = '';

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
                  fullReply += event.delta.text;
                  controller.enqueue(
                    encoder.encode(sseLine(JSON.stringify({ text: event.delta.text })))
                  );
                }
              } catch {
                // Skip malformed SSE chunks
              }
            }
          }

          if (userId && accessToken && memoryEnabled && !skipMemory) {
            try {
              const client = createSupabaseServerClient(accessToken);
              const latestUserMessage =
                [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

              const memoryResult = await processMessageMemory({
                apiKey,
                client,
                userId,
                userMessage: getMessageText(latestUserMessage),
                assistantReply: fullReply,
                conversationId,
                messageId,
                enabled: true,
              });

              const savedMemories = memoryResult.saved.map((memory) => memory.memory_text);
              if (savedMemories.length > 0) {
                controller.enqueue(
                  encoder.encode(sseLine(JSON.stringify({ savedMemories })))
                );
              }
            } catch {
              // Memory extraction should not break chat streaming.
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
