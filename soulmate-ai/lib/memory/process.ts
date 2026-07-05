import type { SupabaseClient } from '@supabase/supabase-js';

import { callAnthropicText } from '@/lib/anthropic';
import { MEMORY_EXTRACTOR_PROMPT, parseExtractionResponse } from '@/lib/memory/extract';
import { detectMemoryIntent } from '@/lib/memory/intent';
import {
  applyExtractionItems,
  createMemory,
  listActiveMemories,
  softDeleteMemory,
} from '@/lib/memory/repository';
import { findBestForgetMatch } from '@/lib/memory/search';
import { isTrivialMemory } from '@/lib/memory/trivial';
import type { MemoryCategory, UserMemory } from '@/types/memory';

type ProcessMemoryOptions = {
  apiKey: string;
  client: SupabaseClient;
  userId: string;
  userMessage: string;
  assistantReply?: string;
  conversationId?: string | null;
  messageId?: string | null;
  enabled: boolean;
};

export type MemoryProcessResult = {
  saved: UserMemory[];
  deletedIds: string[];
};

export async function processMessageMemory(
  options: ProcessMemoryOptions
): Promise<MemoryProcessResult> {
  if (!options.enabled) {
    return { saved: [], deletedIds: [] };
  }

  const intent = detectMemoryIntent(options.userMessage);
  const memories = await listActiveMemories(options.client, options.userId);

  if (intent.type === 'skip') {
    return { saved: [], deletedIds: [] };
  }

  if (intent.type === 'remember') {
    if (isTrivialMemory(intent.text)) {
      return { saved: [], deletedIds: [] };
    }

    const saved = await applyExtractionItems(
      options.client,
      options.userId,
      [
        {
          action: 'add',
          memory_id: null,
          category: 'other',
          memory_text: intent.text,
          confidence: 0.95,
          reason: 'explicit remember request',
        },
      ],
      memories,
      {
        source_conversation_id: options.conversationId,
        source_message_id: options.messageId,
      }
    );

    return saved;
  }

  if (intent.type === 'forget') {
    const match = findBestForgetMatch(memories, intent.text);
    if (!match) return { saved: [], deletedIds: [] };

    await softDeleteMemory(options.client, options.userId, match.id);
    return { saved: [], deletedIds: [match.id] };
  }

  if (isTrivialMemory(options.userMessage)) {
    return { saved: [], deletedIds: [] };
  }

  const extractionInput = [
    'Existing memories JSON:',
    JSON.stringify(
      memories.map((memory) => ({
        id: memory.id,
        category: memory.category,
        memory_text: memory.memory_text,
      }))
    ),
    '',
    'Latest user message:',
    options.userMessage,
    '',
    'Latest assistant reply:',
    options.assistantReply ?? '',
  ].join('\n');

  const raw = await callAnthropicText({
    apiKey: options.apiKey,
    system: MEMORY_EXTRACTOR_PROMPT,
    messages: [{ role: 'user', content: extractionInput }],
    maxTokens: 700,
  });

  const items = parseExtractionResponse(raw);
  return applyExtractionItems(options.client, options.userId, items, memories, {
    source_conversation_id: options.conversationId,
    source_message_id: options.messageId,
  });
}

export async function addManualMemory(
  client: SupabaseClient,
  userId: string,
  input: {
    category: MemoryCategory;
    memory_text: string;
    is_pinned?: boolean;
    importance?: number;
  }
): Promise<UserMemory> {
  return createMemory(client, {
    user_id: userId,
    category: input.category,
    memory_text: input.memory_text,
    confidence: 1,
    importance: input.importance ?? 1,
    is_pinned: input.is_pinned ?? false,
  });
}
