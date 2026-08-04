import { describe, expect, it } from 'vitest';

import {
  buildRecentUsageRows,
  buildTokenUsageRows,
  countDistinctUsers,
  countMessagesByUser,
} from '@/lib/admin/usage-stats';

describe('usage stats helpers', () => {
  it('counts distinct users', () => {
    expect(
      countDistinctUsers([
        { user_id: 'a', created_at: '2026-07-29T10:00:00.000Z' },
        { user_id: 'a', created_at: '2026-07-29T11:00:00.000Z' },
        { user_id: 'b', created_at: '2026-07-29T12:00:00.000Z' },
      ])
    ).toBe(2);
  });

  it('counts messages per user', () => {
    expect(
      countMessagesByUser([
        { user_id: 'a', created_at: '2026-07-29T10:00:00.000Z' },
        { user_id: 'b', created_at: '2026-07-29T11:00:00.000Z' },
        { user_id: 'a', created_at: '2026-07-29T12:00:00.000Z' },
      ]).get('a')
    ).toBe(2);
  });

  it('sorts recent users by messages today then last sign in', () => {
    const rows = buildRecentUsageRows({
      users: [
        { id: 'a', email: 'a@test.com', last_sign_in_at: '2026-07-29T08:00:00.000Z' },
        { id: 'b', email: 'b@test.com', last_sign_in_at: '2026-07-29T12:00:00.000Z' },
      ],
      messagesToday: [
        { user_id: 'a', created_at: '2026-07-29T10:00:00.000Z' },
        { user_id: 'a', created_at: '2026-07-29T11:00:00.000Z' },
        { user_id: 'b', created_at: '2026-07-29T09:00:00.000Z' },
      ],
      messagesLast7Days: [
        { user_id: 'a', created_at: '2026-07-29T10:00:00.000Z' },
        { user_id: 'b', created_at: '2026-07-29T09:00:00.000Z' },
      ],
    });

    expect(rows[0]?.userId).toBe('a');
    expect(rows[0]?.messagesToday).toBe(2);
    expect(rows[1]?.userId).toBe('b');
  });

  it('attaches emails to token usage summaries', () => {
    const rows = buildTokenUsageRows({
      users: [
        { id: 'a', email: 'a@test.com' },
        { id: 'b', email: 'b@test.com' },
      ],
      summaries: [
        {
          userId: 'b',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          requestCount: 2,
        },
        {
          userId: 'a',
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          requestCount: 1,
        },
      ],
    });

    expect(rows[0]?.email).toBe('b@test.com');
    expect(rows[0]?.totalTokens).toBe(150);
    expect(rows[1]?.email).toBe('a@test.com');
  });
});
