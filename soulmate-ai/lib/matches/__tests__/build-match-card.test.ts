import { describe, expect, it } from 'vitest';

import { profileToMatchRecommendation } from '@/lib/matches/build-match-card';
import { buildDefaultDisplayName } from '@/lib/matches/profile-repository';
import type { UserProfile } from '@/types/user-profile';

describe('buildDefaultDisplayName', () => {
  it('prefers Google metadata name over email', () => {
    const name = buildDefaultDisplayName({
      id: 'user-1',
      email: 'eljononp@gmail.com',
      app_metadata: {},
      user_metadata: { full_name: 'Elchanan' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    expect(name).toBe('Elchanan');
  });
});

describe('profileToMatchRecommendation', () => {
  it('maps a real profile to a match card', () => {
    const profile: UserProfile = {
      user_id: 'user-2',
      display_name: 'Maya Cohen',
      avatar_url: null,
      bio: 'Product designer in Tel Aviv.',
      location: 'Tel Aviv',
      looking_for: 'Someone kind and curious',
      discoverable: true,
      last_seen_at: '2026-07-09T00:00:00.000Z',
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
    };

    const match = profileToMatchRecommendation(profile);

    expect(match.id).toBe('user-2');
    expect(match.name).toBe('Maya Cohen');
    expect(match.location).toBe('Tel Aviv');
    expect(match.reasons.length).toBeGreaterThan(0);
    expect(match.matchStrength).toBe('strong');
  });
});
