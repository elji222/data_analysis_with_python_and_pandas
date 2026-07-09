import type { MatchRecommendation } from '@/types/match';

export function buildAskWhyPrompt(match: Pick<MatchRecommendation, 'name'>): string {
  return `Explain why you recommended ${match.name} to me, including similarities, differences, potential risks, and good conversation starters.`;
}
