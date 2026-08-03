import { SOULMATE_SYSTEM_PROMPT } from '@/constants/ai';
import { CHAT_MODELS, getChatModelById } from '@/constants/chat-models';
import { runChatAgent } from '@/lib/agent/run-chat-agent';
import { runCouncilAgent, type CouncilMember } from '@/lib/agent/run-council-agent';
import { runOpenAiAgent } from '@/lib/agent/run-openai-agent';
import type { AgentStreamEvent, AnthropicAgentMessage } from '@/lib/agent/types';
import { appendCurrentDateContext } from '@/lib/current-date';
import { isLikelyImageGenerationRequest } from '@/lib/image-generation/intent';
import { buildChatSystemPrompt } from '@/lib/memory/prompt';
import { processMessageMemory } from '@/lib/memory/process';
import {
  ensureMemorySettings,
  listActiveMemories,
} from '@/lib/memory/repository';
import { filterMemoriesForAiPrompt, rankMemoriesForQuery } from '@/lib/memory/search';
import {
  createSupabaseServerClient,
  ensurePaidAccess,
  requireAuthenticatedUser,
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

  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  const latestUserText = getMessageText(latestUserMessage);

  if (isLikelyImageGenerationRequest(latestUserText)) {
    return { systemPrompt, memoryEnabled: true };
  }

  const client = createSupabaseServerClient(accessToken!);

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
        latestUserText,
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
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    return Response.json(
      { error: 'AI is not configured yet. Add ANTHROPIC_API_KEY to your environment.' },
      { status: 500 }
    );
  }

  try {
    const bodyPromise = request.json();

    const auth = await requireAuthenticatedUser(request);
    if ('error' in auth) return auth.error;

    const body = await bodyPromise;
    const userId = auth.userId;
    const accessToken = auth.token;
    const messages = body.messages as ChatApiMessage[] | undefined;
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
    const messageId = typeof body.messageId === 'string' ? body.messageId : null;
    const skipMemory = body.skipMemory === true;
    const chatModel = getChatModelById(typeof body.model === 'string' ? body.model : null);

    if (!messages?.length) {
      return Response.json({ error: 'Please send at least one message.' }, { status: 400 });
    }

    const providerApiKey =
      chatModel.provider === 'anthropic' || chatModel.provider === 'council'
        ? anthropicApiKey
        : process.env[chatModel.apiKeyEnvVar];

    if (!providerApiKey) {
      return Response.json(
        {
          error: `${chatModel.label} is not set up yet. Add ${chatModel.apiKeyEnvVar} to your environment and deploy again, or switch back to Claude.`,
        },
        { status: 503 }
      );
    }

    if (chatModel.provider === 'council') {
      const configuredMembers = CHAT_MODELS.filter(
        (model) => model.provider !== 'council' && process.env[model.apiKeyEnvVar]
      );

      if (configuredMembers.length < 2) {
        return Response.json(
          {
            error:
              'Council needs at least two models configured. Add OPENAI_API_KEY and/or GEMINI_API_KEY, deploy again, or switch to Claude.',
          },
          { status: 503 }
        );
      }
    }

    // Memory lookup only needs the authenticated user, so it overlaps with the
    // billing checks instead of waiting behind them.
    const systemPromptPromise = resolveSystemPrompt(userId, accessToken, messages, skipMemory);

    const paidAccess = await ensurePaidAccess(auth);
    if ('error' in paidAccess) {
      void systemPromptPromise.catch(() => {});
      return paidAccess.error;
    }

    const { systemPrompt, memoryEnabled } = await systemPromptPromise;
    const finalSystemPrompt = appendCurrentDateContext(systemPrompt);
    const agentMessages = messages as AnthropicAgentMessage[];

    const authorizationHeader =
      request.headers.get('authorization') ?? request.headers.get('Authorization');
    const imageServiceUrl = new URL('/api/generate-image', request.url).toString();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = '';
        let usedTools = false;

        let streamError: string | null = null;

        const enqueueEvent = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sseLine(JSON.stringify(payload))));
        };

        const toolContext = {
          tavilyApiKey: process.env.TAVILY_API_KEY ?? null,
          openaiApiKey: process.env.OPENAI_API_KEY ?? null,
          openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? null,
          imageServiceUrl,
          authorizationHeader,
        };

        const handleAgentEvent = (event: AgentStreamEvent) => {
          try {
            if (event.type === 'status') {
              enqueueEvent({ status: event.status });
              return;
            }

            if (event.type === 'generated_image') {
              enqueueEvent({ generatedImage: event.image });
              return;
            }

            if (event.type === 'image_error') {
              enqueueEvent({ imageError: event.error });
              return;
            }

            if (event.type === 'text' && event.text) {
              enqueueEvent({ text: event.text });
              return;
            }

            if (event.type === 'error') {
              streamError = event.error;
              enqueueEvent({ error: event.error });
            }
          } catch (eventError) {
            console.error('Failed to stream chat event:', eventError);
          }
        };

        // Council members are every individual model whose API key is configured.
        const councilMembers: CouncilMember[] = CHAT_MODELS.filter(
          (model) => model.provider !== 'council'
        )
          .map((model) => ({
            id: model.id,
            label: model.label,
            provider: model.provider as CouncilMember['provider'],
            apiModel: model.apiModel,
            baseUrl: model.baseUrl,
            apiKey: process.env[model.apiKeyEnvVar] ?? '',
          }))
          .filter((member) => member.apiKey);

        try {
          const agentResult =
            chatModel.provider === 'council'
              ? await runCouncilAgent({
                  members: councilMembers,
                  systemPrompt: finalSystemPrompt,
                  messages,
                  onEvent: handleAgentEvent,
                })
              : chatModel.provider === 'anthropic'
                ? await runChatAgent({
                    apiKey: providerApiKey,
                    systemPrompt: finalSystemPrompt,
                    messages: agentMessages,
                    toolContext,
                    onEvent: handleAgentEvent,
                  })
                : await runOpenAiAgent({
                    apiKey: providerApiKey,
                    baseUrl: chatModel.baseUrl!,
                    model: chatModel.apiModel,
                    systemPrompt: finalSystemPrompt,
                    messages,
                    toolContext,
                    onEvent: handleAgentEvent,
                  });

          fullReply = agentResult.fullReply;
          usedTools = agentResult.usedTools;

          if (userId && accessToken && memoryEnabled && !skipMemory && !usedTools) {
            try {
              const client = createSupabaseServerClient(accessToken);
              const latestUserMessage =
                [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

              const memoryResult = await processMessageMemory({
                apiKey: anthropicApiKey,
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
        } catch (error) {
          console.error('Chat stream failed:', error);
          const message =
            streamError ??
            (error instanceof Error && error.message.trim()
              ? error.message
              : 'Stream interrupted.');
          enqueueEvent({ error: message });
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
