-- Discoverable member profiles for Matches
-- Run in Supabase SQL Editor or via supabase db push

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  looking_for text,
  discoverable boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_discoverable_last_seen_idx
  on public.user_profiles (discoverable, last_seen_at desc);

alter table public.user_profiles enable row level security;

drop policy if exists "Authenticated users read discoverable profiles" on public.user_profiles;
create policy "Authenticated users read discoverable profiles"
  on public.user_profiles
  for select
  using (auth.uid() is not null and discoverable = true);

drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();
