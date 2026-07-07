import { describe, expect, it } from 'vitest';

import { appendCurrentDateContext, formatCurrentDate } from '@/lib/current-date';

describe('formatCurrentDate', () => {
  it('formats a known UTC date', () => {
    const formatted = formatCurrentDate(new Date('2026-07-07T15:30:00.000Z'), 'UTC');

    expect(formatted).toBe('Tuesday, July 7, 2026');
  });
});

describe('appendCurrentDateContext', () => {
  it('adds the current date to the system prompt', () => {
    const prompt = appendCurrentDateContext(
      'You are Soulmate AI.',
      new Date('2026-07-07T15:30:00.000Z'),
      'UTC'
    );

    expect(prompt).toContain("Today's date is Tuesday, July 7, 2026.");
  });
});
