import {
  ensureUserProfile,
  listDiscoverableProfiles,
} from '@/lib/matches/profile-repository';
import { profilesToMatchRecommendations } from '@/lib/matches/build-match-card';
import {
  createSupabaseServerClient,
  getAuthenticatedUserId,
  getBearerToken,
} from '@/lib/supabase-server';

async function getAuthedClient(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  const token = getBearerToken(request);
  if (!userId || !token) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const client = createSupabaseServerClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { userId, client, user: data.user };
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
