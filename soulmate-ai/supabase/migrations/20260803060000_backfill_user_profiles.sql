-- Backfill Matches profiles for existing members.
-- Profiles used to be created only when a user opened the Matches screen, so
-- members who never visited it (but do use the app) were invisible to others.
-- Run in Supabase SQL Editor or via supabase db push.

insert into public.user_profiles (user_id, display_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Soulmate member'
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
  )
from auth.users u
on conflict (user_id) do nothing;
