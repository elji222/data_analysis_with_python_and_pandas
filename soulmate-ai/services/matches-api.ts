import { getApiUrl } from '@/lib/api-origin';
import type { MatchRecommendation } from '@/types/match';

type MatchesResponse = {
  matches: MatchRecommendation[];
};

async function authHeaders(accessToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchMatches(accessToken: string): Promise<MatchRecommendation[]> {
  const response = await fetch(getApiUrl('/api/matches'), {
    headers: await authHeaders(accessToken),
  });
  const data = (await response.json()) as MatchesResponse & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load matches.');
  }

  return data.matches ?? [];
}
