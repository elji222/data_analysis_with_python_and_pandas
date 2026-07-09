export type MatchStatus = 'new' | 'saved' | 'waiting' | 'active' | 'passed';

export type MatchStrength = 'strong' | 'worth_exploring';

export type MatchVisibility = 'public' | 'friends';

export type MatchProfile = {
  bio?: string;
  interests?: string[];
  visibility?: MatchVisibility;
  lookingFor?: string;
};

export type MatchRecommendation = {
  id: string;
  name: string;
  age?: number;
  location?: string;
  compatibilitySummary: string;
  reasons: string[];
  matchStrength: MatchStrength;
  status: MatchStatus;
  profile?: MatchProfile;
};

export const MATCH_SECTIONS = [
  { key: 'new' as const, title: 'New Introductions' },
  { key: 'saved' as const, title: 'Saved for Later' },
  { key: 'waiting' as const, title: 'Waiting for Response' },
  { key: 'active' as const, title: 'Active Introductions' },
] satisfies ReadonlyArray<{ key: MatchStatus; title: string }>;
