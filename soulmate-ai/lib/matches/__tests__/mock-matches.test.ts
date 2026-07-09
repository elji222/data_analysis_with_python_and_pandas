import { describe, expect, it } from 'vitest';

import { MOCK_MATCHES } from '@/lib/matches/mock-matches';

describe('mock matches', () => {
  it('keeps sample data out of production UI paths', () => {
    expect(MOCK_MATCHES.length).toBeGreaterThan(0);
    expect(MOCK_MATCHES[0]?.name).toBeTruthy();
  });
});
