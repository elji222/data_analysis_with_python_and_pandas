import { describe, expect, it } from 'vitest';

import {
  buildRecentUsageRows,
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
});
