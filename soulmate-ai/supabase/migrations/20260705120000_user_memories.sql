-- Cross-conversation user memory tables
-- Run in Supabase SQL Editor or via supabase db push

create extension if not exists vector;

create table if not exists public.user_memory_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  preferred_language text,
  answer_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (
    category in (
      'identity',
      'preferences',
      'goals',
      'work',
      'projects',
      'family',
      'education',
      'location',
      'interests',
      'communication_style',
      'important_dates',
      'other'
    )
  ),
  memory_text text not null,
  confidence real not null default 0.8 check (confidence >= 0 and confidence <= 1),
  source_conversation_id text,
  source_message_id text,
  importance integer not null default 0,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_memories_user_id_idx on public.user_memories (user_id);
create index if not exists user_memories_user_active_idx on public.user_memories (user_id, is_deleted);
create index if not exists user_memories_category_idx on public.user_memories (user_id, category);
create index if not exists user_memories_text_search_idx on public.user_memories using gin (to_tsvector('english', memory_text));

alter table public.user_memory_settings enable row level security;
alter table public.user_memories enable row level security;

create policy "Users manage own memory settings"
  on public.user_memory_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own memories"
  on public.user_memories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_memories_updated_at on public.user_memories;
create trigger user_memories_updated_at
  before update on public.user_memories
  for each row execute function public.set_updated_at();

drop trigger if exists user_memory_settings_updated_at on public.user_memory_settings;
create trigger user_memory_settings_updated_at
  before update on public.user_memory_settings
  for each row execute function public.set_updated_at();
