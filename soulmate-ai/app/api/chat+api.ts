import { callAnthropicText } from '@/lib/anthropic';
import { buildChatSystemPrompt } from '@/lib/memory/prompt';
import { processMessageMemory } from '@/lib/memory/process';
import {
  ensureMemorySettings,
  listActiveMemories,
} from '@/lib/memory/repository';
import { rankMemoriesForQuery } from '@/lib/memory/search';
import {
  createSupabaseServerClient,
  getAuthenticatedUserId,
  getBearerToken,
} from '@/lib/supabase-server';
import type { ChatApiMessage } from '@/types/chat';

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
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
    const messageId = typeof body.messageId === 'string' ? body.messageId : null;
    const skipMemory = body.skipMemory === true;

    if (!messages?.length) {
      return Response.json({ error: 'Please send at least one message.' }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId(request);
    const accessToken = getBearerToken(request);

    let systemPrompt = buildChatSystemPrompt(null, []);
    let memoryEnabled = false;

    if (userId && accessToken && !skipMemory) {
      const client = createSupabaseServerClient(accessToken);
      const settings = await ensureMemorySettings(client, userId);
      memoryEnabled = settings.enabled;

      if (settings.enabled) {
        const memories = await listActiveMemories(client, userId);
        const latestUserMessage =
          [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
        const relevant = rankMemoriesForQuery(memories, latestUserMessage, 15);
        systemPrompt = buildChatSystemPrompt(settings, relevant);
      }
    }

    const reply = await callAnthropicText({
      apiKey,
      system: systemPrompt,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      maxTokens: 500,
    });

    let savedMemories: string[] = [];

    if (userId && accessToken && memoryEnabled && !skipMemory) {
      const client = createSupabaseServerClient(accessToken);
      const latestUserMessage =
        [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

      const memoryResult = await processMessageMemory({
        apiKey,
        client,
        userId,
        userMessage: latestUserMessage,
        assistantReply: reply,
        conversationId,
        messageId,
        enabled: true,
      });

      savedMemories = memoryResult.saved.map((memory) => memory.memory_text);
    }

    return Response.json({ reply, savedMemories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    return Response.json({ error: message }, { status: 500 });
  }
}
