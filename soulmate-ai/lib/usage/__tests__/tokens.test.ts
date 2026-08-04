import { describe, expect, it } from 'vitest';

import { aggregateTokenUsageByUser } from '@/lib/usage/repository';
import {
  addTokenUsage,
  estimateTokenUsage,
  estimateTokens,
  formatTokenCount,
} from '@/lib/usage/tokens';

describe('token helpers', () => {
  it('estimates tokens from character length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('builds input/output usage estimates', () => {
    expect(estimateTokenUsage('hello world', 'hi there friend')).toEqual({
      inputTokens: 3,
      outputTokens: 4,
      totalTokens: 7,
    });
  });

  it('adds usage totals', () => {
    expect(
      addTokenUsage(
        { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        { inputTokens: 2, outputTokens: 3, totalTokens: 5 }
      )
    ).toEqual({ inputTokens: 12, outputTokens: 8, totalTokens: 20 });
  });

  it('formats large token counts compactly', () => {
    expect(formatTokenCount(999)).toBe('999');
    expect(formatTokenCount(1500)).toBe('1.5k');
    expect(formatTokenCount(12_500)).toBe('13k');
    expect(formatTokenCount(2_300_000)).toBe('2.3M');
  });

  it('aggregates token rows by user', () => {
    const summaries = aggregateTokenUsageByUser([
      {
        user_id: 'a',
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
        created_at: '2026-08-04T01:00:00.000Z',
      },
      {
        user_id: 'b',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        created_at: '2026-08-04T02:00:00.000Z',
      },
      {
        user_id: 'a',
        input_tokens: 5,
        output_tokens: 5,
        total_tokens: 10,
        created_at: '2026-08-04T03:00:00.000Z',
      },
    ]);

    expect(summaries[0]?.userId).toBe('b');
    expect(summaries[0]?.totalTokens).toBe(150);
    expect(summaries[1]?.userId).toBe('a');
    expect(summaries[1]?.totalTokens).toBe(25);
    expect(summaries[1]?.requestCount).toBe(2);
  });
});
