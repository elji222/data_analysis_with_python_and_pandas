-- Invite-only access: each member gets 5 invite codes; admins have unlimited invites.
-- Run in Supabase SQL Editor or via supabase db push.

create table if not exists public.user_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  invited_by_user_id uuid references auth.users (id) on delete set null,
  invite_code_id uuid,
  invites_remaining int not null default 5 check (invites_remaining >= 0),
  granted_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_user_id uuid references auth.users (id) on delete set null,
  created_by_admin boolean not null default false,
  redeemed_by_user_id uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_access
  drop constraint if exists user_access_invite_code_id_fkey;

alter table public.user_access
  add constraint user_access_invite_code_id_fkey
  foreign key (invite_code_id) references public.invite_codes (id) on delete set null;

create index if not exists invite_codes_creator_idx
  on public.invite_codes (creator_user_id, created_at desc);

create index if not exists invite_codes_redeemed_idx
  on public.invite_codes (redeemed_by_user_id)
  where redeemed_by_user_id is not null;

alter table public.user_access enable row level security;
alter table public.invite_codes enable row level security;

drop policy if exists "Users read own access" on public.user_access;
create policy "Users read own access"
  on public.user_access
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users read own invite codes" on public.invite_codes;
create policy "Users read own invite codes"
  on public.invite_codes
  for select
  using (auth.uid() = creator_user_id);

-- Grandfather existing accounts so current members keep access.
insert into public.user_access (user_id, email, is_admin, invites_remaining, granted_at)
select
  id,
  coalesce(email, ''),
  false,
  5,
  coalesce(created_at, now())
from auth.users
on conflict (user_id) do nothing;
