import {
  ensureUserProfile,
  listDiscoverableProfiles,
} from '@/lib/matches/profile-repository';
import { profilesToMatchRecommendations } from '@/lib/matches/build-match-card';
import {
  requireUserAccess,
} from '@/lib/supabase-server';

async function getAuthedClient(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) {
    return { error: auth.error };
  }

  return {
    userId: auth.userId,
    client: auth.client,
    user: auth.user,
  };
}

export async function GET(request: Request) {
  const auth = await getAuthedClient(request);
  if ('error' in auth) return auth.error;

  try {
    await ensureUserProfile(auth.client, auth.user);
    const profiles = await listDiscoverableProfiles(auth.client, auth.userId);
    const matches = profilesToMatchRecommendations(profiles);

    return Response.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load matches.';
    return Response.json({ error: message }, { status: 500 });
  }
}
