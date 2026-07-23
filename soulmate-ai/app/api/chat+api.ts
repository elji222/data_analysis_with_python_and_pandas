import { SOULMATE_SYSTEM_PROMPT } from '@/constants/ai';
import { runChatAgent } from '@/lib/agent/run-chat-agent';
import type { AnthropicAgentMessage } from '@/lib/agent/types';
import { appendCurrentDateContext } from '@/lib/current-date';
import { buildChatSystemPrompt } from '@/lib/memory/prompt';
import { processMessageMemory } from '@/lib/memory/process';
import {
  ensureMemorySettings,
  listActiveMemories,
} from '@/lib/memory/repository';
import { filterMemoriesForAiPrompt, rankMemoriesForQuery } from '@/lib/memory/search';
import {
  createSupabaseServerClient,
  requireUserAccess,
} from '@/lib/supabase-server';
import type { ApiContentBlock, ApiTextBlock, ChatApiMessage } from '@/types/chat';

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
    const auth = await requireUserAccess(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const userId = auth.userId;
    const accessToken = auth.token;
    const messages = body.messages as ChatApiMessage[] | undefined;
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
    const messageId = typeof body.messageId === 'string' ? body.messageId : null;
    const skipMemory = body.skipMemory === true;

    if (!messages?.length) {
      return Response.json({ error: 'Please send at least one message.' }, { status: 400 });
    }

    const { systemPrompt, memoryEnabled } = await resolveSystemPrompt(
      userId,
      accessToken,
      messages,
      skipMemory
    );
    const finalSystemPrompt = appendCurrentDateContext(systemPrompt);
    const agentMessages = messages as AnthropicAgentMessage[];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = '';

        try {
          fullReply = await runChatAgent({
            apiKey,
            systemPrompt: finalSystemPrompt,
            messages: agentMessages,
            toolContext: {
              tavilyApiKey: process.env.TAVILY_API_KEY ?? null,
            },
            onEvent: (event) => {
              if (event.type === 'status' && event.status === 'searching') {
                controller.enqueue(
                  encoder.encode(sseLine(JSON.stringify({ status: 'searching' })))
                );
                return;
              }

              if (event.type === 'text' && event.text) {
                controller.enqueue(
                  encoder.encode(sseLine(JSON.stringify({ text: event.text })))
                );
                return;
              }

              if (event.type === 'error') {
                controller.enqueue(
                  encoder.encode(sseLine(JSON.stringify({ error: event.error })))
                );
              }
            },
          });

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
