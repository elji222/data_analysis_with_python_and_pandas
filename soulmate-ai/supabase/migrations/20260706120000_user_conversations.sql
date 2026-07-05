-- Cloud-synced chat conversations per user

create table if not exists public.user_conversations (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  is_deleted boolean not null default false
);

create table if not exists public.user_conversation_messages (
  id text primary key,
  conversation_id text not null references public.user_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message_text text not null default '',
  attachments jsonb,
  created_at timestamptz not null,
  sort_order integer not null default 0
);

create table if not exists public.user_chat_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_conversation_id text,
  updated_at timestamptz not null default now()
);

create index if not exists user_conversations_user_active_idx
  on public.user_conversations (user_id, is_deleted, updated_at desc);

create index if not exists user_conversation_messages_conversation_idx
  on public.user_conversation_messages (conversation_id, sort_order);

create index if not exists user_conversation_messages_user_idx
  on public.user_conversation_messages (user_id);

alter table public.user_conversations enable row level security;
alter table public.user_conversation_messages enable row level security;
alter table public.user_chat_preferences enable row level security;

create policy "Users manage own conversations"
  on public.user_conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own conversation messages"
  on public.user_conversation_messages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own chat preferences"
  on public.user_chat_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_chat_preferences_updated_at on public.user_chat_preferences;
create trigger user_chat_preferences_updated_at
  before update on public.user_chat_preferences
  for each row execute function public.set_updated_at();
