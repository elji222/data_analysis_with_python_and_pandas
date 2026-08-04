import type { SupabaseClient } from '@supabase/supabase-js';

import type { TokenUsage, TokenUsageSource } from '@/lib/usage/tokens';

export type RecordTokenUsageParams = {
  userId: string;
  modelId: string;
  usage: TokenUsage;
  source: TokenUsageSource;
  conversationId?: string | null;
  messageId?: string | null;
};

export type UserTokenUsageRow = {
  user_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  created_at: string;
};

export type UserTokenUsageSummary = {
  userId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
};

export async function recordTokenUsage(
  client: SupabaseClient,
  params: RecordTokenUsageParams
): Promise<void> {
  const totalTokens =
    params.usage.totalTokens > 0
      ? params.usage.totalTokens
      : params.usage.inputTokens + params.usage.outputTokens;

  if (totalTokens <= 0) return;

  const { error } = await client.from('user_token_usage').insert({
    user_id: params.userId,
    model_id: params.modelId,
    input_tokens: params.usage.inputTokens,
    output_tokens: params.usage.outputTokens,
    total_tokens: totalTokens,
    conversation_id: params.conversationId ?? null,
    message_id: params.messageId ?? null,
    source: params.source,
  });

  if (error) throw error;
}

export function aggregateTokenUsageByUser(
  rows: UserTokenUsageRow[]
): UserTokenUsageSummary[] {
  const byUser = new Map<string, UserTokenUsageSummary>();

  for (const row of rows) {
    const current = byUser.get(row.user_id) ?? {
      userId: row.user_id,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
    };

    current.inputTokens += row.input_tokens;
    current.outputTokens += row.output_tokens;
    current.totalTokens += row.total_tokens;
    current.requestCount += 1;
    byUser.set(row.user_id, current);
  }

  return [...byUser.values()].sort((left, right) => right.totalTokens - left.totalTokens);
}

export async function fetchTokenUsageSince(
  client: SupabaseClient,
  sinceIso: string
): Promise<UserTokenUsageRow[]> {
  const { data, error } = await client
    .from('user_token_usage')
    .select('user_id, input_tokens, output_tokens, total_tokens, created_at')
    .gte('created_at', sinceIso);

  if (error) throw error;
  return (data ?? []) as UserTokenUsageRow[];
}
