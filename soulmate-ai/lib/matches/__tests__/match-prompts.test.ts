import { describe, expect, it } from 'vitest';

import { buildAskWhyPrompt } from '@/lib/matches/match-prompts';

describe('match prompts', () => {
  it('builds an Ask AI Why prompt for a match', () => {
    const prompt = buildAskWhyPrompt({ name: 'Maya Cohen' });

    expect(prompt).toContain('Maya Cohen');
    expect(prompt).toContain('similarities');
    expect(prompt).toContain('conversation starters');
  });
});
