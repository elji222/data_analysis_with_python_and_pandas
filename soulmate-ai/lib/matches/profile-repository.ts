import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { UserProfile } from '@/types/user-profile';

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function buildDefaultDisplayName(user: User) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromMetadata =
    readMetadataString(metadata, ['full_name', 'name', 'display_name']) ??
    readMetadataString((metadata.custom_claims as Record<string, unknown> | undefined) ?? {}, [
      'name',
    ]);

  if (fromMetadata) return fromMetadata;

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) return emailPrefix;

  return 'Soulmate member';
}

export function buildAvatarUrl(user: User) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return readMetadataString(metadata, ['avatar_url', 'picture']);
}

export async function ensureUserProfile(
  client: SupabaseClient,
  user: User
): Promise<UserProfile> {
  const displayName = buildDefaultDisplayName(user);
  const avatarUrl = buildAvatarUrl(user);
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await client
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (readError) throw readError;

  const payload = {
    user_id: user.id,
    display_name: existing?.display_name?.trim() || displayName,
    avatar_url: existing?.avatar_url ?? avatarUrl,
    bio: existing?.bio ?? null,
    location: existing?.location ?? null,
    looking_for: existing?.looking_for ?? null,
    discoverable: existing?.discoverable ?? true,
    last_seen_at: now,
  };

  const { data, error } = await client
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function listDiscoverableProfiles(
  client: SupabaseClient,
  currentUserId: string
): Promise<UserProfile[]> {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('discoverable', true)
    .neq('user_id', currentUserId)
    .order('last_seen_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserProfile[];
}
