-- Backfill user_profiles for members who signed up before profiles were
-- created on sign-in. Previously a profile row was only created when a user
-- opened the Matches tab, so members who never did were invisible to everyone
-- else in Matches.
-- Run in Supabase SQL Editor or via supabase db push

insert into public.user_profiles (user_id, display_name, avatar_url, last_seen_at)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data -> 'custom_claims' ->> 'name'), ''),
    nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''),
    'Soulmate member'
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
  ),
  coalesce(u.last_sign_in_at, u.created_at, now())
from auth.users u
on conflict (user_id) do nothing;
