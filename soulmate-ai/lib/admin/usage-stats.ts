import type { SupabaseClient } from '@supabase/supabase-js';

import {
  aggregateTokenUsageByUser,
  fetchTokenUsageSince,
} from '@/lib/usage/repository';
import type {
  AdminTokenUsageUserRow,
  AdminUsageStats,
  AdminUsageUserRow,
} from '@/types/admin-usage';

type MessageRow = {
  user_id: string;
  created_at: string;
};

function startOfUtcDay(date = new Date()): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

export function countDistinctUsers(messages: MessageRow[]): number {
  return new Set(messages.map((row) => row.user_id)).size;
}

export function countMessagesByUser(messages: MessageRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of messages) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

export function buildRecentUsageRows(params: {
  users: Array<{
    id: string;
    email?: string | null;
    last_sign_in_at?: string | null;
  }>;
  messagesToday: MessageRow[];
  messagesLast7Days: MessageRow[];
  limit?: number;
}): AdminUsageUserRow[] {
  const todayCounts = countMessagesByUser(params.messagesToday);
  const weekCounts = countMessagesByUser(params.messagesLast7Days);
  const limit = params.limit ?? 12;

  return params.users
    .map((user) => ({
      userId: user.id,
      email: user.email ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      messagesToday: todayCounts.get(user.id) ?? 0,
      messagesLast7Days: weekCounts.get(user.id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.messagesToday !== left.messagesToday) {
        return right.messagesToday - left.messagesToday;
      }

      const leftSignIn = left.lastSignInAt ? Date.parse(left.lastSignInAt) : 0;
      const rightSignIn = right.lastSignInAt ? Date.parse(right.lastSignInAt) : 0;
      return rightSignIn - leftSignIn;
    })
    .slice(0, limit);
}

export function buildTokenUsageRows(params: {
  users: Array<{ id: string; email?: string | null }>;
  summaries: Array<{
    userId: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requestCount: number;
  }>;
  limit?: number;
}): AdminTokenUsageUserRow[] {
  const emails = new Map(params.users.map((user) => [user.id, user.email ?? null]));
  const limit = params.limit ?? 50;

  return params.summaries
    .map((summary) => ({
      userId: summary.userId,
      email: emails.get(summary.userId) ?? null,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      totalTokens: summary.totalTokens,
      requestCount: summary.requestCount,
    }))
    .slice(0, limit);
}

export async function fetchAdminUsageStats(
  serviceClient: SupabaseClient
): Promise<AdminUsageStats> {
  const todayIso = startOfUtcDay().toISOString();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: usersData, error: usersError }, todayResult, weekResult] = await Promise.all([
    serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    serviceClient
      .from('user_conversation_messages')
      .select('user_id, created_at')
      .eq('role', 'user')
      .gte('created_at', todayIso),
    serviceClient
      .from('user_conversation_messages')
      .select('user_id, created_at')
      .eq('role', 'user')
      .gte('created_at', sevenDaysAgoIso),
  ]);

  if (usersError) throw usersError;
  if (todayResult.error) throw todayResult.error;
  if (weekResult.error) throw weekResult.error;

  const messagesToday = (todayResult.data ?? []) as MessageRow[];
  const messagesLast7Days = (weekResult.data ?? []) as MessageRow[];
  const users = usersData.users ?? [];

  let tokenUsageLast24Hours: AdminTokenUsageUserRow[] = [];
  let tokensLast24Hours = 0;
  let tokenUsersLast24Hours = 0;

  try {
    const tokenRows = await fetchTokenUsageSince(serviceClient, twentyFourHoursAgoIso);
    const summaries = aggregateTokenUsageByUser(tokenRows);
    tokenUsageLast24Hours = buildTokenUsageRows({ users, summaries });
    tokensLast24Hours = summaries.reduce((sum, row) => sum + row.totalTokens, 0);
    tokenUsersLast24Hours = summaries.length;
  } catch {
    // Migration may not be applied yet; keep message stats available.
  }

  return {
    generatedAt: new Date().toISOString(),
    totalUsers: users.length,
    activeUsersToday: countDistinctUsers(messagesToday),
    messagesToday: messagesToday.length,
    activeUsersLast7Days: countDistinctUsers(messagesLast7Days),
    messagesLast7Days: messagesLast7Days.length,
    recentUsers: buildRecentUsageRows({
      users,
      messagesToday,
      messagesLast7Days,
    }),
    tokensLast24Hours,
    tokenUsersLast24Hours,
    tokenUsageLast24Hours,
  };
}
