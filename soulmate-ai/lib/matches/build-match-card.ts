import type { MatchRecommendation } from '@/types/match';
import type { UserProfile } from '@/types/user-profile';

function buildReasons(profile: UserProfile): string[] {
  const reasons = ['Also signed in to Soulmate AI and open to introductions'];

  if (profile.location?.trim()) {
    reasons.push(`Based in ${profile.location.trim()}`);
  }

  if (profile.looking_for?.trim()) {
    reasons.push(`Looking for: ${profile.looking_for.trim()}`);
  }

  if (profile.bio?.trim()) {
    reasons.push('Shared a short profile bio');
  }

  reasons.push('Your AI can explain more if you tap Ask AI Why');

  return reasons.slice(0, 5);
}

export function profileToMatchRecommendation(profile: UserProfile): MatchRecommendation {
  const name = profile.display_name?.trim() || 'Soulmate member';
  const bio = profile.bio?.trim();
  const lookingFor = profile.looking_for?.trim();

  const compatibilitySummary = bio
    ? bio
    : lookingFor
      ? `${name} is on Soulmate AI and looking for ${lookingFor}.`
      : `${name} is an active Soulmate AI member you can get to know.`;

  return {
    id: profile.user_id,
    name,
    location: profile.location?.trim() || undefined,
    compatibilitySummary,
    reasons: buildReasons(profile),
    matchStrength: bio || lookingFor ? 'strong' : 'worth_exploring',
    status: 'new',
    profile: {
      bio: bio || undefined,
      lookingFor: lookingFor || undefined,
      visibility: 'public',
      avatarUrl: profile.avatar_url?.trim() || undefined,
    },
  };
}

export function profilesToMatchRecommendations(profiles: UserProfile[]): MatchRecommendation[] {
  return profiles.map(profileToMatchRecommendation);
}
